/**
 * all-expense-heads.js
 * Show ALL expense heads from bank statement = ₹12,85,586.53 (415 entries)
 * Combines tally-expenses-final.js (401) + 14 missing from PDF
 */
const XLSX = require('xlsx');
const FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';
const wb = XLSX.readFile(FILE, { cellDates: false, sheetRows: 0 });
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

// Parse all Dr entries from Sheet1
const entries = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const date = row[0] || '';
  const month = row[1] || '';
  const narration = (row[2] || '').toString().trim();
  const chq = (row[3] || '').toString().trim();
  const rawAmt = row[4];
  const expCol = (row[5] || '').toString().trim();
  const incCol = (row[6] || '').toString().trim();

  let amount = 0, isDr = false;
  if (typeof rawAmt === 'number' && rawAmt > 0) {
    isDr = true; amount = rawAmt;
  } else if (typeof rawAmt === 'string') {
    const m = rawAmt.match(/^([\d,]+\.?\d*)\s*\(Dr\)/i);
    if (m) { isDr = true; amount = parseFloat(m[1].replace(/,/g, '')); }
  }
  if (!isDr || amount <= 0) continue;
  entries.push({ date, month, narration, chq, amount, expCol, incCol, row: i+1 });
}

// 14 missing entries from PDF (not in Sheet1)
const missing = [
  { date: '11 Apr 24', narration: 'Hotel Green Par', amount: 620, category: 'Food & Beverages' },
  { date: '01 May 24', narration: 'Sonu gupta/Dividend', amount: 12600, category: 'Dividend Paid' },
  { date: '01 May 24', narration: 'Mohan Pandurang', amount: 24000, category: 'Mohan Kalburgi (Director)' },
  { date: '28 May 24', narration: 'Mahesh Balasahe', amount: 625, category: 'Miscellaneous Expenses' },
  { date: '28 May 24', narration: 'Balasaheb Kashi', amount: 95, category: 'Miscellaneous Expenses' },
  { date: '10 Jun 24', narration: 'Suhas kalburgi/Solapur', amount: 13000, category: 'Suhas Kalburgi' },
  { date: '11 Jun 24', narration: 'Laxmi Mohan Kal', amount: 2000, category: 'Laxmi Kalburgi (Teacher)' },
  { date: '23 Jun 24', narration: 'Sivan Govindara', amount: 370, category: 'Miscellaneous Expenses' },
  { date: '23 Jun 24', narration: 'Shravan Fruit M', amount: 100, category: 'Food & Beverages' },
  { date: '09 Jul 24', narration: 'META/Upi Transaction', amount: 1000, category: 'Facebook Ads' },
  { date: '11 Jul 24', narration: 'Google', amount: 639, category: 'Google Ads' },
  { date: '16 Nov 24', narration: 'Sonu Gupta/MB UPI', amount: 12600, category: 'Dividend Paid' },
  { date: '16 Nov 24', narration: 'SentIMPS MAHI', amount: 2400, category: 'Staff Payments' },
  { date: '22 Dec 24', narration: 'Yuvraj Ravindra/car', amount: 2000, category: 'Vehicle Maintenance' },
];

// Categorization rules (same as tally-expenses-final.js)
function categorize(e) {
  const n = (e.narration || '').toUpperCase();
  const exp = (e.expCol || '').toUpperCase();

  // EXP column overrides
  if (exp.includes('RENT')) return 'Office Rent';
  if (exp.includes('ELECTRICITY') || exp.includes('ELECT')) return 'Electricity Expenses';
  if (exp.includes('CLASS EXP')) return 'Class Expenses';
  if (exp.includes('MACBOOK') || exp.includes('MAC BOOK')) return 'MacBook EMI';
  if (exp.includes('LAPTOP EMI') || exp.includes('L&T')) return 'Laptop EMI (L&T Finance)';
  if (exp.includes('FUEL') || exp.includes('PETROL') || exp.includes('DIESEL')) return 'Fuel Expenses';
  if (exp.includes('VEHICLE') || exp.includes('PUNCTURE') || exp.includes('TYRE')) return 'Vehicle Maintenance';
  if (exp.includes('FOOD') || exp.includes('HOTEL') || exp.includes('ZOMATO') || exp.includes('SWIGGY')) return 'Food & Beverages';
  if (exp.includes('WORKSHOP')) return 'Workshop Expenses';
  if (exp.includes('TRAVEL') || exp.includes('IRCTC') || exp.includes('TICKET') || exp.includes('BUS') || exp.includes('TRAIN')) return 'Travel Booking';
  if (exp.includes('MOBILE RECHARGE') || exp.includes('RECHARGE') || exp.includes('AIRTEL') || exp.includes('JIO')) return 'Mobile Recharge';
  if (exp.includes('MEDICAL') || exp.includes('MEDICINE') || exp.includes('HOSPITAL')) return 'Medical Expenses';
  if (exp.includes('PRINTING') || exp.includes('STATIONERY')) return 'Printing & Stationery';
  if (exp.includes('AMAZON')) return 'Amazon Purchases';
  if (exp.includes('STAFF') || exp.includes('SALARY')) return 'Staff Payments';
  if (exp.includes('DIVIDEND')) return 'Dividend Paid';
  if (exp.includes('OFF EXP') || exp.includes('OFFICE') || exp === 'EXP') return 'Office Expenses';
  if (exp.includes('ROC') || exp.includes('MCA') || exp.includes('GOV')) return 'Government Fees';
  if (exp.includes('CA FEE') || exp.includes('AUDIT')) return 'CA Fees';
  if (exp.includes('INVEST')) return 'Investment Return';

  // Narration-based rules
  if (n.includes('FACEBOOK') || n.includes('META') || n.includes('WWW FACEBOOK')) return 'Facebook Ads';
  if (n.includes('GOOGLE') && (n.includes('ADS') || n.includes('ADWORDS'))) return 'Google Ads';
  if (n.includes('GOOGLE PLAY')) return 'Google Ads';
  if (n.includes('GOOGLE')) return 'Google Ads';
  if (n.includes('ZVC INDIA') || n.includes('ZOOM')) return 'Zoom Subscription';
  if (n.includes('CANVA')) return 'Canva Subscription';
  if (n.includes('AMAZON')) return 'Amazon Purchases';
  if (n.includes('IRCTC') || n.includes('RAILWAY') || n.includes('MAKEMYTRIP') || n.includes('CLEARTRIP') || n.includes('REDBUS') || n.includes('ABHIBUS')) return 'Travel Booking';
  if (n.includes('MSRTC')) return 'Travel Booking';
  if (n.includes('ZOMATO') || n.includes('SWIGGY')) return 'Food & Beverages';
  if (n.includes('TALLY')) return 'Software Expenses';
  if (n.includes('DOMAIN') || n.includes('HOSTING') || n.includes('DEVELOPER')) return 'Domain & Hosting';

  // Person-based
  if (n.includes('MOHAN PANDURANG') || n.includes('MOHAN KALBURGI') || n.includes('9654031327')) return 'Mohan Kalburgi (Director)';
  if (n.includes('UPAMANYU') || n.includes('UPMANYU')) return 'Upamanyu Kalburgi (Director)';
  if (n.includes('LAXMI MOHAN') || n.includes('LAXMI KALBURGI')) return 'Laxmi Kalburgi (Teacher)';
  if (n.includes('TURYA')) return 'Turya Kalburgi (Teacher)';
  if (n.includes('PANDURANG KALBURGI') || n.includes('PANDURANG MOHAN')) return 'Pandurang Kalburgi';
  if (n.includes('ARVIND') && n.includes('KALBURGI')) return 'Arvind Kalburgi';
  if (n.includes('SONU GUPTA') || n.includes('SONU GUP')) return 'Dividend Paid';

  // Bank transfers
  if (n.includes('UBINX3879') || n.includes('UNION BANK') || (n.includes('UBI') && n.includes('SWAR'))) return 'Fund Transfer (Own)';
  if (n.includes('HDFC') && (n.includes('TRANSFER') || n.includes('CREDIT'))) return 'Fund Transfer (HDFC)';
  if (n.includes('CASH DEPOSIT') || n.includes('CASH WDL') || n.includes('ATM') || n.includes('CASH WITHDRAWAL')) return 'Contra (Cash-Bank)';

  // Bank charges
  if (n.includes('CHARGE') || n.includes('FEES') || n.includes('DEBIT CARD') || n.includes('CHG') || n.includes('SERVICE TAX')) return 'Bank Charges';

  // Government
  if (n.includes('MCA') || n.includes('MINIST') || n.includes('GOV') || n.includes('STAMP')) return 'Government Fees';

  return 'Miscellaneous Expenses';
}

// Categorize all Sheet1 entries
const heads = {};
function addToHead(cat, amt) {
  if (!heads[cat]) heads[cat] = { count: 0, amount: 0 };
  heads[cat].count++;
  heads[cat].amount += amt;
}

for (const e of entries) {
  addToHead(categorize(e), e.amount);
}

// Add 14 missing entries
for (const m of missing) {
  addToHead(m.category, m.amount);
}

// Sort by amount descending
const sorted = Object.entries(heads).sort((a, b) => b[1].amount - a[1].amount);

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ALL EXPENSE HEADS — BANK TOTAL ₹12,85,586.53 (415 entries)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Category                                   Count     Amount (Rs)');
console.log('────────────────────────────────────────── ───── ──────────────');

let grandTotal = 0;
let grandCount = 0;
for (const [cat, data] of sorted) {
  const amt = data.amount.toFixed(2);
  const padCat = cat.padEnd(42);
  const padCount = String(data.count).padStart(5);
  const padAmt = amt.padStart(14);
  console.log(`${padCat} ${padCount} ${padAmt}`);
  grandTotal += data.amount;
  grandCount += data.count;
}
console.log('────────────────────────────────────────── ───── ──────────────');
console.log(`${'GRAND TOTAL'.padEnd(42)} ${String(grandCount).padStart(5)} ${grandTotal.toFixed(2).padStart(14)}`);
console.log('');
console.log('Expected: 415 entries, Rs.12,85,586.53');
console.log('Match:', grandCount === 415 && Math.abs(grandTotal - 1285586.53) < 1 ? 'YES' : 'NO');
