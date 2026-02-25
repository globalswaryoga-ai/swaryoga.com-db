/**
 * Full Bank Statement Reconciliation — FY 2024-25
 * Parses ALL entries from Kotak Bank Statement Sheet1,
 * auto-categorizes uncategorized entries, computes true totals,
 * and verifies Opening + Credits - Debits = Closing.
 *
 * Run: node scripts/reconcile-bank-statement.js
 */
const XLSX = require('xlsx');

const wb = XLSX.readFile('/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx');
const ws = wb.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log(`\nTotal rows in Sheet1: ${data.length}\n`);

// ─── Parse helpers ───────────────────────────────────────────────────────────

function parseAmount(val) {
  if (val === null || val === undefined || val === '') return { amount: 0, type: null };
  const s = String(val).trim();
  const isCr = s.includes('(Cr)');
  const isDr = s.includes('(Dr)');
  const num = parseFloat(s.replace(/,/g, '').replace(/\(Cr\)|\(Dr\)/g, ''));
  if (isNaN(num)) return { amount: 0, type: null };
  // Plain number (no Cr/Dr suffix) = debit (money out)
  return { amount: num, type: isCr ? 'Cr' : (isDr ? 'Dr' : 'Dr') };
}

function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return String(serial || '');
  const d = new Date((serial - 25569) * 86400000);
  return d.toISOString().slice(0, 10);
}

// ─── Auto-categorization rules for uncategorized entries ─────────────────────

function autoCategory(narration) {
  const n = (narration || '').toUpperCase();

  // Contra / Bank Transfers
  if (n.includes('UBINX3879') || n.includes('UNION BANK') || n.includes('/CONTRA') || n.includes('/LAND') || n.includes('/TEXT'))
    return 'CONTRA_UNION_BANK';
  if (n.includes('UBINX0674') && (n.includes('UPAMNYU') || n.includes('KKBKTRANS') || n.includes('SOFTWARE') || n.includes('OFFICE EX')))
    return 'CONTRA_UPAMANYU_PERSONAL';

  // Director / Personal
  if (n.includes('MOHAN PANDURANG') || n.includes('MOHAN KALB') || n.includes('LAXMI MOHAN'))
    return 'DIRECTOR_PERSONAL';
  if (n.includes('TURYA MOHAN') || n.includes('UPAMANYU MOHAN') || n.includes('UPAMNYU'))
    return 'DIRECTOR_PERSONAL';
  if (n.includes('ARVIND KALBURGI'))
    return 'DIRECTOR_FAMILY';

  // Rent
  if (n.includes('KAILAS RAH') || n.includes('/RENT'))
    return 'RENT';

  // Dividends paid
  if (n.includes('DIVIDEND') || n.includes('DIVIDENT'))
    return 'DIVIDENDS_PAID';

  // Facebook / Meta Ads
  if (n.includes('META') || n.includes('FACEBOOK') || n.includes('FACEBOOKADSMANA'))
    return 'ADVERTISING_META';

  // Zoom
  if (n.includes('ZOOM.US') || n.includes('ZOOM'))
    return 'ZOOM_SUBSCRIPTION';

  // Travel
  if (n.includes('IRCTC') || n.includes('REDBUS') || n.includes('MSRTC'))
    return 'TRAVEL';
  if (n.includes('PETROL') || n.includes('MOBILITY') || n.includes('DISEL') || n.includes('DIESEL') || n.includes('HP PETROL'))
    return 'TRAVEL_FUEL';

  // EMI / Loans
  if (n.includes('LNTFINANCIALSER') || n.includes('L&T'))
    return 'EMI_LAPTOP';
  if (n.includes('MACKBOOK EMI') || n.includes('MACBOOK'))
    return 'EMI_LAPTOP';

  // Electricity
  if (n.includes('MSEDCL') || n.includes('LIGHT BILL'))
    return 'ELECTRICITY';

  // Canva
  if (n.includes('CANVA'))
    return 'SOFTWARE_CANVA';

  // Tally
  if (n.includes('TALLY'))
    return 'SOFTWARE_TALLY';

  // Food / Zomato / Hotels
  if (n.includes('ZOMATO') || n.includes('DOMINOS'))
    return 'FOOD_DELIVERY';
  if (n.includes('HOTEL') || n.includes('RESTAURANT'))
    return 'FOOD_HOTEL';

  // Medical
  if (n.includes('MEDICAL') || n.includes('MEDICIN'))
    return 'MEDICAL';

  // Amazon
  if (n.includes('AMAZON'))
    return 'AMAZON_PURCHASES';

  // Lagad Abhay (Class organizer / staff)
  if (n.includes('LAGAD ABHAY'))
    return 'STAFF_LAGAD_ABHAY';

  // Karuna (staff)
  if (n.includes('KARUNA CH'))
    return 'STAFF_KARUNA';

  // Government / ROC
  if (n.includes('CENTRAL BOARD') || n.includes('NON TAX RECEIPT'))
    return 'GOV_ROC_FILING';

  // Bank charges
  if (n.includes('CHRG:') || n.includes('ANNUAL FEE') || n.includes('DECL FEE'))
    return 'BANK_CHARGES';

  // Investment return
  if (n.includes('INVESTMENT RETU') || n.includes('MANJINDER KAUR'))
    return 'INVESTMENT_RETURN';

  // JioCinema / Entertainment
  if (n.includes('JIOCINEMA'))
    return 'ENTERTAINMENT';

  // Mobile / Recharge
  if (n.includes('JIOPREPAID') || n.includes('MOBILE RECHARGE'))
    return 'MOBILE_RECHARGE';

  // Class expenses
  if (n.includes('/CLASS') && n.includes('UBINX3879'))
    return 'CONTRA_UNION_BANK';
  if (n.includes('CLASS'))
    return 'CLASS_EXPENSES';

  // Xerox / Printing
  if (n.includes('XEROX') || n.includes('XERO'))
    return 'PRINTING';

  // Shubham (personal loan / return)
  if (n.includes('SHUBHAM'))
    return 'PERSONAL_ADVANCE';

  // Water filter
  if (n.includes('WATER FILTER') || n.includes('AQUAGUARD'))
    return 'OFFICE_EQUIPMENT';

  // Computer
  if (n.includes('COMPUTER'))
    return 'OFFICE_EQUIPMENT';

  // Automobile / Car
  if (n.includes('AUTOMOBILE') || n.includes('CAR REPAIR') || n.includes('MANI MOTORS') || n.includes('NEWASKAR AUTO'))
    return 'VEHICLE_MAINTENANCE';

  // Tax
  if (n.includes('TAX CARE') || n.includes('TAXCARE'))
    return 'PROFESSIONAL_FEES';

  // PG services
  if (n.includes('PG SERVICE'))
    return 'PG_SERVICES';

  return 'UNCATEGORIZED';
}

// ─── Process all rows ────────────────────────────────────────────────────────

const allEntries = [];
let totalDebits = 0;
let totalCredits = 0;
const catDebits = {};  // category → total debit amount
const catCredits = {}; // category → total credit amount

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length < 5) continue;

  const date = excelDate(row[0]);
  const month = row[1];
  const narration = String(row[2] || '');
  const chq = row[3];
  const amountRaw = row[4];
  const expType = (row[5] || '').toString().trim();
  const incomeType = (row[6] || '').toString().trim();
  const balanceRaw = row[7];

  const { amount, type } = parseAmount(amountRaw);
  if (amount === 0) continue;

  const isCredit = type === 'Cr';
  let category = '';

  if (isCredit) {
    totalCredits += amount;
    category = incomeType || 'UNCATEGORIZED_INCOME';
    if (!catCredits[category]) catCredits[category] = { count: 0, total: 0, entries: [] };
    catCredits[category].count++;
    catCredits[category].total += amount;
    catCredits[category].entries.push({ date, amount, narration: narration.substring(0, 60) });
  } else {
    totalDebits += amount;
    // Use bank's EXP label if present; otherwise auto-categorize
    category = expType || autoCategory(narration);
    if (!catDebits[category]) catDebits[category] = { count: 0, total: 0, entries: [] };
    catDebits[category].count++;
    catDebits[category].total += amount;
    catDebits[category].entries.push({ date, amount, narration: narration.substring(0, 60) });
  }

  allEntries.push({ i, date, narration: narration.substring(0, 70), amount, isCredit, category });
}

// ─── Opening / Closing balance verification ─────────────────────────────────

const openingBalance = 37440.78; // From CA report FY23-24 closing
const closingBalance = 43750.97; // From bank statement / user confirmation
const computedClosing = openingBalance + totalCredits - totalDebits;

console.log('═'.repeat(80));
console.log('  BALANCE VERIFICATION');
console.log('═'.repeat(80));
console.log(`  Opening Balance (01-Apr-2024):  Rs.${openingBalance.toLocaleString('en-IN')}`);
console.log(`  Total Credits (money IN):       Rs.${totalCredits.toLocaleString('en-IN')}`);
console.log(`  Total Debits (money OUT):       Rs.${totalDebits.toLocaleString('en-IN')}`);
console.log(`  Computed Closing:               Rs.${computedClosing.toFixed(2)}`);
console.log(`  Actual Closing (31-Mar-2025):   Rs.${closingBalance.toLocaleString('en-IN')}`);
console.log(`  Difference:                     Rs.${(computedClosing - closingBalance).toFixed(2)}`);

// ─── DEBIT CATEGORIES (All Money Out) ────────────────────────────────────────

console.log('\n' + '═'.repeat(80));
console.log('  ALL DEBIT CATEGORIES (Money Out of Bank)');
console.log('═'.repeat(80));

const sortedDebits = Object.entries(catDebits).sort((a, b) => b[1].total - a[1].total);
let grandTotalDebits = 0;

// Group into macro categories for BS mapping
const macroGroups = {
  'CONTRA / TRANSFERS (not expenses)': [],
  'DIRECTOR SALARY / REMUNERATION': [],
  'OFFICE & ADMIN': [],
  'ADVERTISING': [],
  'TRAVEL & FUEL': [],
  'STAFF PAYMENTS': [],
  'DIVIDENDS PAID': [],
  'EMI / LOANS': [],
  'SOFTWARE & SUBSCRIPTIONS': [],
  'ASSET PURCHASES': [],
  'GOVERNMENT / PROFESSIONAL': [],
  'BANK CHARGES': [],
  'PERSONAL / MISC': [],
  'OTHER': []
};

function macroGroup(cat) {
  const c = cat.toUpperCase();
  if (c.includes('CONTRA')) return 'CONTRA / TRANSFERS (not expenses)';
  if (c.includes('DIRECTOR') || c.includes('TEACHER') || c.includes('SALARY') || c.includes('RENUMA'))
    return 'DIRECTOR SALARY / REMUNERATION';
  if (c.includes('RENT') || c.includes('ELECTRICITY') || c.includes('OFFICE') || c.includes('LIGHT'))
    return 'OFFICE & ADMIN';
  if (c.includes('META') || c.includes('FACEBOOK') || c.includes('FACE BOOK') || c.includes('ADVERTISING'))
    return 'ADVERTISING';
  if (c.includes('TRAVEL') || c.includes('FUEL') || c.includes('TRAVALL'))
    return 'TRAVEL & FUEL';
  if (c.includes('LAGAD') || c.includes('KARUNA') || c.includes('STAFF'))
    return 'STAFF PAYMENTS';
  if (c.includes('DIVIDEND') || c.includes('DIVIDENT'))
    return 'DIVIDENDS PAID';
  if (c.includes('EMI') || c.includes('MACKBOOK'))
    return 'EMI / LOANS';
  if (c.includes('ZOOM') || c.includes('CANVA') || c.includes('TALLY') || c.includes('SOFTWARE'))
    return 'SOFTWARE & SUBSCRIPTIONS';
  if (c.includes('MOBILE-ONE') || c.includes('EQUIPMENT') || c.includes('COMPUTER'))
    return 'ASSET PURCHASES';
  if (c.includes('GOV') || c.includes('ROC') || c.includes('PROFESSIONAL') || c.includes('TAX'))
    return 'GOVERNMENT / PROFESSIONAL';
  if (c.includes('BANK_CHARGE') || c === 'BANK CHARGES')
    return 'BANK CHARGES';
  if (c.includes('PERSONAL') || c.includes('SHUBHAM') || c.includes('FAMILY'))
    return 'PERSONAL / MISC';
  return 'OTHER';
}

sortedDebits.forEach(([cat, data]) => {
  const mg = macroGroup(cat);
  macroGroups[mg].push({ cat, ...data });
  grandTotalDebits += data.total;
  console.log(`  ${cat.padEnd(40)} ${String(data.count).padStart(3)}x | Rs.${data.total.toLocaleString('en-IN', {minimumFractionDigits:2}).padStart(14)}`);
});

console.log(`  ${'─'.repeat(70)}`);
console.log(`  ${'TOTAL DEBITS'.padEnd(40)}      | Rs.${grandTotalDebits.toLocaleString('en-IN', {minimumFractionDigits:2}).padStart(14)}`);

// ─── MACRO GROUP SUMMARY ──────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(80));
console.log('  MACRO GROUP SUMMARY (for BS/P&L mapping)');
console.log('═'.repeat(80));

let totalNonContraExpense = 0;
let contraTotal = 0;

Object.entries(macroGroups).forEach(([group, items]) => {
  if (items.length === 0) return;
  const groupTotal = items.reduce((s, i) => s + i.total, 0);
  const groupCount = items.reduce((s, i) => s + i.count, 0);
  const isContra = group.includes('CONTRA');
  if (isContra) contraTotal += groupTotal;
  else totalNonContraExpense += groupTotal;

  console.log(`\n  ${isContra ? '🔄' : '💸'} ${group}`);
  items.forEach(item => {
    console.log(`     ${item.cat.padEnd(38)} ${String(item.count).padStart(3)}x | Rs.${item.total.toLocaleString('en-IN', {minimumFractionDigits:2}).padStart(12)}`);
  });
  console.log(`     ${'SUBTOTAL'.padEnd(38)}      | Rs.${groupTotal.toLocaleString('en-IN', {minimumFractionDigits:2}).padStart(12)}`);
});

console.log('\n' + '─'.repeat(80));
console.log(`  Total Contra/Transfers:    Rs.${contraTotal.toLocaleString('en-IN', {minimumFractionDigits:2}).padStart(14)}`);
console.log(`  Total Real Expenses:       Rs.${totalNonContraExpense.toLocaleString('en-IN', {minimumFractionDigits:2}).padStart(14)}`);
console.log(`  Grand Total Debits:        Rs.${grandTotalDebits.toLocaleString('en-IN', {minimumFractionDigits:2}).padStart(14)}`);

// ─── CREDIT CATEGORIES ───────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(80));
console.log('  ALL CREDIT CATEGORIES (Money Into Bank)');
console.log('═'.repeat(80));

const sortedCredits = Object.entries(catCredits).sort((a, b) => b[1].total - a[1].total);
let grandTotalCredits = 0;
sortedCredits.forEach(([cat, data]) => {
  grandTotalCredits += data.total;
  console.log(`  ${cat.padEnd(40)} ${String(data.count).padStart(3)}x | Rs.${data.total.toLocaleString('en-IN', {minimumFractionDigits:2}).padStart(14)}`);
});
console.log(`  ${'─'.repeat(70)}`);
console.log(`  ${'TOTAL CREDITS'.padEnd(40)}      | Rs.${grandTotalCredits.toLocaleString('en-IN', {minimumFractionDigits:2}).padStart(14)}`);

// ─── UNCATEGORIZED DETAIL ────────────────────────────────────────────────────

const uncatDebits = catDebits['UNCATEGORIZED'];
if (uncatDebits && uncatDebits.entries.length > 0) {
  console.log('\n' + '═'.repeat(80));
  console.log(`  STILL UNCATEGORIZED DEBITS (${uncatDebits.entries.length} entries, Rs.${uncatDebits.total.toLocaleString('en-IN')})`);
  console.log('═'.repeat(80));
  uncatDebits.entries.sort((a, b) => b.amount - a.amount).forEach(e => {
    console.log(`  ${e.date} Rs.${e.amount.toLocaleString('en-IN').padStart(10)} | ${e.narration}`);
  });
}

// ─── DB COMPARISON ───────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(80));
console.log('  BANK STATEMENT vs DB — True Comparison');
console.log('═'.repeat(80));
console.log(`
  BANK (Kotak):
    Total Money IN (Credits):      Rs.${totalCredits.toLocaleString('en-IN', {minimumFractionDigits:2})}
    Total Money OUT (Debits):      Rs.${totalDebits.toLocaleString('en-IN', {minimumFractionDigits:2})}
    Of which Contra/Transfers:     Rs.${contraTotal.toLocaleString('en-IN', {minimumFractionDigits:2})}
    Real Expenses only:            Rs.${totalNonContraExpense.toLocaleString('en-IN', {minimumFractionDigits:2})}

  DB (Current FY 2024-25):
    Income:                        Rs.11,69,286.72
    Expenses (excl depreciation):  Rs.7,94,421.00
    Depreciation:                  Rs.2,07,476.00
    Total Expenses:                Rs.10,01,897.00

  BS GAP ANALYSIS:
    Assets:                        Rs.7,65,780.30
    Equity + Liabilities:          Rs.10,34,205.77
    Current Gap:                   Rs.2,68,425.47

  BANK shows Real Expenses:        Rs.${totalNonContraExpense.toLocaleString('en-IN', {minimumFractionDigits:2})}
  DB shows Expenses (no dep):      Rs.7,94,421.00
  Difference:                      Rs.${(totalNonContraExpense - 794421).toLocaleString('en-IN', {minimumFractionDigits:2})}
  (Positive = bank has MORE expenses than DB)
`);
