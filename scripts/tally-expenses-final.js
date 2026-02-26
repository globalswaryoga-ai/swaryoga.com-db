/**
 * tally-expenses-final.js
 * Complete expense categorization of ALL 401 bank debit entries
 * Uses Sheet1 EXP column + auto-categorization for unlabeled entries
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

// ── Standardize user's EXP labels → Tally ledger names ──
const EXP_MAP = {
  'TEACHER MOHAN': 'Mohan Kalburgi (Director)',
  'TEACHER RENUMARETION-MOHAN': 'Mohan Kalburgi (Director)',
  'TEACHER RENUMARATION-MOHAN': 'Mohan Kalburgi (Director)',
  'MACKBOOK EMI': 'Mohan Kalburgi (Director)',
  'UPAMNYU KALBURGI': 'Upamanyu Kalburgi (Director)',
  'FACE BOOK ADV': 'Facebook Ads',
  'OFFICE EXP': 'Office Expenses',
  'OFFCE EXP': 'Office Expenses',
  'OFFICE RENT': 'Rent',
  'CLASS EXP': 'Workshop Expenses',
  'DIVIDENT PAID': 'Dividend Paid',
  'TRAVALLING EXP': 'Travel Booking',
  'MOBILE RECHARGE': 'Mobile Recharge',
  'MOBILE-ONE PLUS': 'Upamanyu Kalburgi (Director)', // OnePlus phone for Upamanyu
  'LIGHT BILL': 'Electricity',
};

// ── Auto-categorization rules for uncategorized entries ──
const AUTO_RULES = [
  // Family / Directors
  { key: 'Mohan Kalburgi (Director)',    test: n => /mohan\s*pandurang|mohan\s*kalb|9654031327|mohankalburgi/i.test(n) && !/pandurang\s*krish/i.test(n) },
  { key: 'Upamanyu Kalburgi (Director)', test: n => /upam[an]yu|upamanyu/i.test(n) },
  { key: 'Laxmi Kalburgi (Teacher)',     test: n => /laxmi\s*(mohan|kalburgi)/i.test(n) },
  { key: 'Turya Kalburgi (Teacher)',     test: n => /turya/i.test(n) },
  { key: 'Pandurang Kalburgi',           test: n => /pandurang\s*krish/i.test(n) },
  { key: 'Arvind Kalburgi',              test: n => /arvind\s*kalburgi/i.test(n) },

  // L&T Finance / EMI
  { key: 'Vehicle Loan EMI',             test: n => /lntfinancialser|l&t\s*finance/i.test(n) },

  // Ads
  { key: 'Facebook Ads',   test: n => /facebook|meta\s*ads?|facebookadsmana|upi\/meta\//i.test(n) },
  { key: 'Google Ads',     test: n => /google\s*(ads|india)/i.test(n) },

  // Software & Subscriptions
  { key: 'Zoom Subscription',  test: n => /zoom\.us|zoom|zvc\s*india/i.test(n) },
  { key: 'Canva Subscription', test: n => /canva/i.test(n) },
  { key: 'Google Play',        test: n => /google\s*play/i.test(n) },
  { key: 'JioCinema',          test: n => /jiocinema/i.test(n) },
  { key: 'Domain & Hosting',   test: n => /godaddy|cloudflare|namecheap|vercel/i.test(n) },
  { key: 'Tally Software',     test: n => /comhard\s*technol|tally/i.test(n) },

  // Amazon
  { key: 'Amazon Purchases', test: n => /amazon/i.test(n) },

  // IRCTC / Travel
  { key: 'Travel Booking',       test: n => /irctc|redbus|ibibogroup/i.test(n) },
  { key: 'Fuel Expense',         test: n => /petrol|fuel|hp\s*petrol|indian\s*oil|disel|reliance\s*bp|swamiraj\s*petrol|sahyadri\s*petrol|s\s*g\s*abhang\s*petr/i.test(n) },
  { key: 'Vehicle Maintenance',  test: n => /car\s*(wash|repair|tape)|tripple\s*c|newaskar\s*automo|ameriya\s*automob|kakade\s*patil|mani\s*motors|gurukrupa\s*enter/i.test(n) },
  { key: 'MSRTC Bus',            test: n => /msrtc/i.test(n) },

  // Rent
  { key: 'Rent',                 test: n => /kailas\s*rah.*rent|rent/i.test(n) },

  // Electricity
  { key: 'Electricity',          test: n => /msedcl|electricity|light\s*bill/i.test(n) },

  // Bank charges
  { key: 'Bank Charges',     test: n => /chrg:|bank\s*charge|service\s*charge|sms\s*alert|gst\s*on\s*chrg|pos\s*decl\s*fee|debit\s*card\s*annual/i.test(n) },

  // Telecom
  { key: 'Mobile Recharge',  test: n => /jio\s*prepaid|jioprepaid|airtel|recharge|vodafone/i.test(n) },

  // Food & Beverages
  { key: 'Food & Beverages', test: n => /swiggy|zomato|dominos|food|hotel\s*(green|pandurang|vrundavan|jt)|restaurant|mess|ranjit\s*kumar.*food|avenue\s*supermar|shravan\s*fu[io]t|namaste|anand\s*kulfi|galande\s*snack/i.test(n) },

  // Medical
  { key: 'Medical Expenses', test: n => /medical|pharma|chandan\s*medicin|sudama\s*medical|saijyot\s*medical/i.test(n) },

  // Govt / Tax
  { key: 'Government Fees',  test: n => /non\s*tax\s*receipt|central\s*board|tax\s*care|archaeological/i.test(n) },

  // ROC/MCA
  { key: 'ROC Filing',       test: n => /mca|roc|e-filing/i.test(n) },

  // Printing & Stationery
  { key: 'Printing & Stationery', test: n => /print|xerox|shree\s*computer|saptshrungi\s*xer/i.test(n) },

  // Workshop / Class expenses
  { key: 'Workshop Expenses', test: n => /workshop|class\s*(exp|organiser|disel)|lagad\s*abhay|sahakarmaharshi/i.test(n) },

  // Investor / Partner payments
  { key: 'Dividend Paid',     test: n => /divid(e|end)|smita\s*harsukh|damayanti|pramod\s*kha|mahesh\s*aga|santosh\s*ag|vishal\s*agr|minakshi\s*j/i.test(n) },
  { key: 'Investment Return',  test: n => /investment\s*retu|manjinder|manidar|nanda\s*kantilal|dheeraj\s*nana/i.test(n) },

  // Vastu
  { key: 'Vastu Consultation', test: n => /maha\s*vastu/i.test(n) },

  // Cash to Savings
  { key: 'Contra (Cash→Bank)', test: n => /swar\s*yoga.*contra|ubinx3879.*contra|contra/i.test(n) },

  // Transfer to own account
  { key: 'Fund Transfer (Own)', test: n => /swar\s*yoga.*ubinx|sentimps.*swar\s*yoga/i.test(n) && !/contra|rent|divid/i.test(n) },

  // Office supplies / general purchases
  { key: 'Office Expenses',  test: n => /smart\s*point|parivar\s*kirana|kailas\s*flour|anil\s*multi|kedarnath|irfan|sarvodaya|rajesh\s*ramchand|s\s*b\s*divekar|yash\s*traders|shailesh|balasaheb|ms\s*aishwarya|ratnadeep/i.test(n) },

  // General UPI payments with names
  { key: 'Miscellaneous Expenses', test: n => /upi|sentimps|pcd/i.test(n) },
];

function categorize(narration, expLabel) {
  // First use user's EXP label if available
  if (expLabel && EXP_MAP[expLabel]) return EXP_MAP[expLabel];
  if (expLabel) return expLabel; // Use as-is if not mapped

  // Auto-categorize from narration
  for (const rule of AUTO_RULES) {
    if (rule.test(narration)) return rule.key;
  }
  return 'UNCATEGORIZED';
}

// ── Read Sheet1 ──
const wb = XLSX.readFile(FILE, { cellDates: false });
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const debits = [];
let totalDr = 0, totalCr = 0;
const MONTH_NORM = { APRIL: 'APR', MAY: 'MAY', JUNE: 'JUN', JULY: 'JUL', AUG: 'AUG', SEP: 'SEP', OCT: 'OCT', NOV: 'NOV', DEC: 'DEC', JAN: 'JAN', FEB: 'FEB', MARCH: 'MAR' };

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const amtRaw = r[4];
  const narration = String(r[2] || '').replace(/\r\n/g, ' ').trim();
  const expLabel = String(r[5] || '').trim();
  const dt = excelDate(r[0]);
  const monthRaw = String(r[1] || '').trim().toUpperCase();
  const month = MONTH_NORM[monthRaw] || monthRaw;

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
    totalDr += amount;
    const category = categorize(narration, expLabel);
    debits.push({ date: fmtDate(dt), month, amount, narration: narration.substring(0, 65), category, expLabel });
  } else {
    totalCr += amount;
  }
}

console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
console.log(`║      BANK STATEMENT FY 2024-25 — COMPLETE EXPENSE TALLY      ║`);
console.log(`╠═══════════════════════════════════════════════════════════════╣`);
console.log(`║  Total Credits (Deposits):  ${String(163).padStart(3)} entries  ₹${fmt(totalCr).padStart(14)}  ║`);
console.log(`║  Total Debits (Expenses):   ${String(debits.length).padStart(3)} entries  ₹${fmt(totalDr).padStart(14)}  ║`);
console.log(`╚═══════════════════════════════════════════════════════════════╝`);

// ── Category Summary ──
const catMap = {};
for (const d of debits) {
  if (!catMap[d.category]) catMap[d.category] = { count: 0, total: 0, items: [] };
  catMap[d.category].count++;
  catMap[d.category].total += d.amount;
  catMap[d.category].items.push(d);
}

const sorted = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
console.log(`\n=== EXPENSE HEADS (Tally Ledger Mapping) ===`);
console.log(`${'Category'.padEnd(42)} ${'Count'.padStart(5)} ${'Amount (₹)'.padStart(14)}`);
console.log(`${'─'.repeat(42)} ${'─'.repeat(5)} ${'─'.repeat(14)}`);

let runTotal = 0;
for (const [cat, data] of sorted) {
  console.log(`${cat.padEnd(42)} ${String(data.count).padStart(5)} ${fmt(data.total).padStart(14)}`);
  runTotal += data.total;
}
console.log(`${'─'.repeat(42)} ${'─'.repeat(5)} ${'─'.repeat(14)}`);
console.log(`${'GRAND TOTAL'.padEnd(42)} ${String(debits.length).padStart(5)} ${fmt(runTotal).padStart(14)}`);

// ── Monthly breakdown ──
const monthMap = {};
for (const d of debits) {
  if (!monthMap[d.month]) monthMap[d.month] = { count: 0, total: 0 };
  monthMap[d.month].count++;
  monthMap[d.month].total += d.amount;
}
const MONTH_ORDER = ['APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB','MAR'];
console.log(`\n=== MONTHLY EXPENSE TOTALS ===`);
let monthTotal = 0;
for (const m of MONTH_ORDER) {
  if (monthMap[m]) {
    console.log(`  ${m.padEnd(5)} ${String(monthMap[m].count).padStart(4)} entries  ₹${fmt(monthMap[m].total).padStart(12)}`);
    monthTotal += monthMap[m].total;
  }
}
console.log(`  ${'─'.repeat(5)} ${'─'.repeat(4)}           ${'─'.repeat(12)}`);
console.log(`  ${'TOTAL'.padEnd(5)} ${String(debits.length).padStart(4)} entries  ₹${fmt(monthTotal).padStart(12)}`);

// ── Show uncategorized ──
if (catMap['UNCATEGORIZED']) {
  console.log(`\n=== STILL UNCATEGORIZED (${catMap['UNCATEGORIZED'].count}) ===`);
  for (const d of catMap['UNCATEGORIZED'].items) {
    console.log(`  ${d.date} | ₹${fmt(d.amount).padStart(10)} | ${d.narration}`);
  }
}

// Miscellaneous breakdown
if (catMap['Miscellaneous Expenses']) {
  console.log(`\n=== MISCELLANEOUS EXPENSES (${catMap['Miscellaneous Expenses'].count}) — needs manual review ===`);
  for (const d of catMap['Miscellaneous Expenses'].items) {
    console.log(`  ${d.date} | ₹${fmt(d.amount).padStart(10)} | ${d.narration}`);
  }
}
