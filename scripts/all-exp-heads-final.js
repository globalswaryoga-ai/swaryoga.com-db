/**
 * all-exp-heads-final.js
 * Complete listing: ALL 415 Dr entries = ₹12,85,586.53
 * Uses tally-expenses-final.js rules + 14 missing PDF entries
 */
const XLSX = require('xlsx');
const FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';

function fmt(n) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

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
  'MOBILE-ONE PLUS': 'Upamanyu Kalburgi (Director)',
  'LIGHT BILL': 'Electricity',
};

const AUTO_RULES = [
  { key: 'Mohan Kalburgi (Director)',    test: n => /mohan\s*pandurang|mohan\s*kalb|9654031327|mohankalburgi/i.test(n) && !/pandurang\s*krish/i.test(n) },
  { key: 'Upamanyu Kalburgi (Director)', test: n => /upam[an]yu|upamanyu/i.test(n) },
  { key: 'Laxmi Kalburgi (Teacher)',     test: n => /laxmi\s*(mohan|kalburgi)/i.test(n) },
  { key: 'Turya Kalburgi (Teacher)',     test: n => /turya/i.test(n) },
  { key: 'Pandurang Kalburgi',           test: n => /pandurang\s*krish/i.test(n) },
  { key: 'Arvind Kalburgi',              test: n => /arvind\s*kalburgi/i.test(n) },
  { key: 'Laptop EMI (L&T Finance)',     test: n => /lntfinancialser|l&t\s*finance/i.test(n) },
  { key: 'Facebook Ads',   test: n => /facebook|meta\s*ads?|facebookadsmana|upi\/meta\//i.test(n) },
  { key: 'Google Ads',     test: n => /google\s*(ads|india)/i.test(n) },
  { key: 'Zoom Subscription',  test: n => /zoom\.us|zoom|zvc\s*india/i.test(n) },
  { key: 'Canva Subscription', test: n => /canva/i.test(n) },
  { key: 'Google Play',        test: n => /google\s*play/i.test(n) },
  { key: 'JioCinema',          test: n => /jiocinema/i.test(n) },
  { key: 'Domain & Hosting',   test: n => /godaddy|cloudflare|namecheap|vercel/i.test(n) },
  { key: 'Tally Software',     test: n => /comhard\s*technol|tally/i.test(n) },
  { key: 'Amazon Purchases', test: n => /amazon/i.test(n) },
  { key: 'Travel Booking',       test: n => /irctc|redbus|ibibogroup|msrtc/i.test(n) },
  { key: 'Fuel Expense',         test: n => /petrol|fuel|hp\s*petrol|indian\s*oil|disel|reliance\s*bp|swamiraj\s*petrol|sahyadri\s*petrol|s\s*g\s*abhang\s*petr/i.test(n) },
  { key: 'Vehicle Maintenance',  test: n => /car\s*(wash|repair|tape)|tripple\s*c|newaskar\s*automo|ameriya\s*automob|kakade\s*patil|mani\s*motors|gurukrupa\s*enter/i.test(n) },
  { key: 'Rent',                 test: n => /kailas\s*rah.*rent|rent/i.test(n) },
  { key: 'Electricity',          test: n => /msedcl|electricity|light\s*bill/i.test(n) },
  { key: 'Bank Charges',     test: n => /chrg:|bank\s*charge|service\s*charge|sms\s*alert|gst\s*on\s*chrg|pos\s*decl\s*fee|debit\s*card\s*annual/i.test(n) },
  { key: 'Mobile Recharge',  test: n => /jio\s*prepaid|jioprepaid|airtel|recharge|vodafone/i.test(n) },
  { key: 'Food & Beverages', test: n => /swiggy|zomato|dominos|food|hotel\s*(green|pandurang|vrundavan|jt)|restaurant|mess|ranjit\s*kumar.*food|avenue\s*supermar|shravan\s*fu[io]t|namaste|anand\s*kulfi|galande\s*snack/i.test(n) },
  { key: 'Medical Expenses', test: n => /medical|pharma|chandan\s*medicin|sudama\s*medical|saijyot\s*medical/i.test(n) },
  { key: 'Government Fees',  test: n => /non\s*tax\s*receipt|central\s*board|tax\s*care|archaeological/i.test(n) },
  { key: 'ROC Filing',       test: n => /mca|roc|e-filing/i.test(n) },
  { key: 'Printing & Stationery', test: n => /print|xerox|shree\s*computer|saptshrungi\s*xer/i.test(n) },
  { key: 'Workshop Expenses', test: n => /workshop|class\s*(exp|organiser|disel)|lagad\s*abhay|sahakarmaharshi/i.test(n) },
  { key: 'Dividend Paid',     test: n => /divid(e|end)|smita\s*harsukh|damayanti|pramod\s*kha|mahesh\s*aga|santosh\s*ag|vishal\s*agr|minakshi\s*j/i.test(n) },
  { key: 'Investment Return',  test: n => /investment\s*retu|manjinder|manidar|nanda\s*kantilal|dheeraj\s*nana/i.test(n) },
  { key: 'Vastu Consultation', test: n => /maha\s*vastu/i.test(n) },
  { key: 'Contra (Cash-Bank)', test: n => /swar\s*yoga.*contra|ubinx3879.*contra|contra/i.test(n) },
  { key: 'Fund Transfer (Own)', test: n => /swar\s*yoga.*ubinx|sentimps.*swar\s*yoga/i.test(n) && !/contra|rent|divid/i.test(n) },
  { key: 'Office Expenses',  test: n => /smart\s*point|parivar\s*kirana|kailas\s*flour|anil\s*multi|kedarnath|irfan|sarvodaya|rajesh\s*ramchand|s\s*b\s*divekar|yash\s*traders|shailesh|balasaheb|ms\s*aishwarya|ratnadeep/i.test(n) },
  { key: 'Miscellaneous Expenses', test: n => /upi|sentimps|pcd/i.test(n) },
];

function categorize(narration, expLabel) {
  if (expLabel && EXP_MAP[expLabel]) return EXP_MAP[expLabel];
  if (expLabel) return expLabel;
  for (const rule of AUTO_RULES) {
    if (rule.test(narration)) return rule.key;
  }
  return 'UNCATEGORIZED';
}

// Parse Sheet1
const wb = XLSX.readFile(FILE, { cellDates: false });
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

const catMap = {};
function addEntry(cat, amt) {
  if (!catMap[cat]) catMap[cat] = { count: 0, total: 0 };
  catMap[cat].count++;
  catMap[cat].total += amt;
}

let totalDr = 0, drCount = 0;

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const amtRaw = r[4];
  const narration = String(r[2] || '').replace(/\r\n/g, ' ').trim();
  const expLabel = String(r[5] || '').trim().toUpperCase();
  let amount = null, isDr = false;

  if (typeof amtRaw === 'number') { amount = amtRaw; isDr = true; }
  else if (typeof amtRaw === 'string') {
    const m = amtRaw.match(/^([\d,]+(?:\.\d+)?)\s*\((Dr|Cr)\)$/i);
    if (m) { amount = parseFloat(m[1].replace(/,/g, '')); isDr = m[2].toLowerCase() === 'dr'; }
  }
  if (!isDr || !amount) continue;
  drCount++;
  totalDr += amount;
  addEntry(categorize(narration, expLabel), amount);
}

// 14 missing entries from PDF
const missing14 = [
  { cat: 'Food & Beverages', amt: 620 },      // Hotel Green Par
  { cat: 'Dividend Paid', amt: 12600 },        // Sonu gupta
  { cat: 'Mohan Kalburgi (Director)', amt: 24000 }, // Mohan Pandurang
  { cat: 'Miscellaneous Expenses', amt: 625 }, // Mahesh Balasahe
  { cat: 'Miscellaneous Expenses', amt: 95 },  // Balasaheb Kashi
  { cat: 'Suhas Kalburgi', amt: 13000 },       // Suhas kalburgi/Solapur
  { cat: 'Laxmi Kalburgi (Teacher)', amt: 2000 }, // Laxmi Mohan Kal
  { cat: 'Miscellaneous Expenses', amt: 370 }, // Sivan Govindara
  { cat: 'Food & Beverages', amt: 100 },       // Shravan Fruit M
  { cat: 'Facebook Ads', amt: 1000 },          // META
  { cat: 'Google Ads', amt: 639 },             // Google
  { cat: 'Dividend Paid', amt: 12600 },        // Sonu Gupta
  { cat: 'Staff Payments', amt: 2400 },        // MAHI
  { cat: 'Vehicle Maintenance', amt: 2000 },   // Yuvraj Ravindra/car
];

for (const m of missing14) {
  addEntry(m.cat, m.amt);
  totalDr += m.amt;
  drCount++;
}

// Print sorted by amount
const sorted = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ALL EXPENSE HEADS — BANK TOTAL ₹12,85,587 (415 entries)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log(`${'#'.padStart(3)} ${'Category'.padEnd(38)} ${'Count'.padStart(5)} ${'Amount'.padStart(14)}`);
console.log(`${'─'.repeat(3)} ${'─'.repeat(38)} ${'─'.repeat(5)} ${'─'.repeat(14)}`);

let i = 1;
for (const [cat, data] of sorted) {
  console.log(`${String(i++).padStart(3)} ${cat.padEnd(38)} ${String(data.count).padStart(5)} ${fmt(data.total).padStart(14)}`);
}
console.log(`${'─'.repeat(3)} ${'─'.repeat(38)} ${'─'.repeat(5)} ${'─'.repeat(14)}`);
console.log(`    ${'GRAND TOTAL'.padEnd(38)} ${String(drCount).padStart(5)} ${fmt(totalDr).padStart(14)}`);
console.log('');
console.log(`Expected: 415 entries = ₹12,85,586.53`);
console.log(`Got:      ${drCount} entries = ₹${fmt(totalDr)}`);
console.log(`Match: ${drCount === 415 && Math.abs(totalDr - 1285586.53) < 1 ? 'YES ✓' : 'NO ✗'}`);
