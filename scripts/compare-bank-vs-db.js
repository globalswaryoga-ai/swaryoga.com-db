/**
 * Parse bank statement Excel, extract all Cr (deposit) entries,
 * categorize them and compare with existing receipt vouchers
 * to find the missing ₹87,672.52
 */
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const mongoose = require('mongoose');

const FILE_PATH = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';

function parseAmount(val) {
  if (typeof val === 'number') return { amount: val, type: 'Dr' }; // numeric = expense (Dr)
  if (typeof val !== 'string') return null;
  const cleaned = val.replace(/,/g, '').trim();
  const match = cleaned.match(/([\d.]+)\((Cr|Dr)\)/);
  if (match) return { amount: parseFloat(match[1]), type: match[2] };
  return null;
}

function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return '';
  const d = new Date((serial - 25569) * 86400 * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function run() {
  // Step 1: Read Excel
  const workbook = XLSX.readFile(FILE_PATH);
  const sheet = workbook.Sheets['Sheet1'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Headers: DATE, MONTH, narration, chq, amount, EXP, INCOME DETAILS, balance
  // Row 0 is header

  const deposits = [];
  const expenses = [];
  let totalDeposits = 0;
  let totalExpenses = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 5) continue;

    const dateSerial = row[0];
    const month = row[1] || '';
    const narration = (row[2] || '').toString().replace(/\r\n/g, ' ').trim();
    const chq = (row[3] || '').toString();
    const amountRaw = row[4];
    const expCategory = (row[5] || '').toString().trim();
    const incomeCategory = (row[6] || '').toString().trim();
    const balance = (row[7] || '').toString();

    const parsed = parseAmount(amountRaw);
    if (!parsed) continue;

    const date = excelDateToISO(dateSerial);

    if (parsed.type === 'Cr' || incomeCategory) {
      deposits.push({
        date,
        month,
        narration,
        chq,
        amount: parsed.amount,
        category: incomeCategory || expCategory || 'UNKNOWN',
      });
      totalDeposits += parsed.amount;
    } else {
      expenses.push({
        date,
        month,
        narration,
        amount: parsed.amount,
        category: expCategory || 'UNKNOWN',
      });
      totalExpenses += parsed.amount;
    }
  }

  console.log('=== BANK STATEMENT SUMMARY ===');
  console.log(`Total Deposits (Cr): ${deposits.length} entries, Rs.${totalDeposits.toFixed(2)}`);
  console.log(`Total Expenses (Dr): ${expenses.length} entries, Rs.${totalExpenses.toFixed(2)}`);
  console.log('');

  // Categorize deposits
  const investDeposits = [];
  const courseDeposits = [];
  const otherDeposits = [];
  let investTotal = 0, courseTotal = 0, otherTotal = 0;

  for (const d of deposits) {
    const cat = d.category.toLowerCase();
    const narr = d.narration.toLowerCase();

    if (/invest|capital|share|preference/i.test(cat) || /invest|capital|share/i.test(narr)) {
      investDeposits.push(d);
      investTotal += d.amount;
    } else if (/swar yoga|course|workshop/i.test(cat) || /swar yoga|course/i.test(narr)) {
      courseDeposits.push(d);
      courseTotal += d.amount;
    } else {
      otherDeposits.push(d);
      otherTotal += d.amount;
    }
  }

  console.log('=== DEPOSIT CATEGORIES ===');
  console.log(`Investment/Capital: ${investDeposits.length} entries, Rs.${investTotal.toFixed(2)}`);
  console.log(`Course/Workshop:    ${courseDeposits.length} entries, Rs.${courseTotal.toFixed(2)}`);
  console.log(`Other:              ${otherDeposits.length} entries, Rs.${otherTotal.toFixed(2)}`);
  console.log('');

  // Show ALL deposit entries
  console.log('=== ALL DEPOSIT ENTRIES FROM BANK ===');
  for (const d of deposits) {
    const cat = d.category.substring(0, 25).padEnd(25);
    console.log(`  ${d.date} | ${cat} | Rs.${d.amount.toFixed(2).padStart(12)} | ${d.narration.substring(0, 60)}`);
  }

  console.log('');
  console.log('=== "OTHER" DEPOSITS (not investment, not course) ===');
  for (const d of otherDeposits) {
    console.log(`  ${d.date} | ${d.category.padEnd(30)} | Rs.${d.amount.toFixed(2).padStart(12)} | ${d.narration.substring(0, 60)}`);
  }

  // Step 2: Connect to DB and compare
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const v = mongoose.connection.collection('tally_manual_vouchers');
  const existingReceipts = await v.find({ financialYear: '2024-25', voucherType: 'Receipt' }).toArray();

  console.log('');
  console.log(`=== DB COMPARISON ===`);
  console.log(`Existing receipt vouchers: ${existingReceipts.length}`);
  console.log(`Bank deposit entries: ${deposits.length}`);
  console.log(`DB total: Rs.${existingReceipts.reduce((s, r) => s + Math.abs(r.amount), 0).toFixed(2)}`);
  console.log(`Bank total: Rs.${totalDeposits.toFixed(2)}`);
  console.log(`Missing: Rs.${(totalDeposits - existingReceipts.reduce((s, r) => s + Math.abs(r.amount), 0)).toFixed(2)}`);

  // Show monthly income from bank vs DB
  console.log('');
  console.log('=== MONTHLY COURSE INCOME COMPARISON ===');
  console.log('Month          | Bank (Course)  | DB (Course)    | Diff');

  const monthlyBank = {};
  for (const d of courseDeposits) {
    const m = d.date.substring(0, 7); // YYYY-MM
    monthlyBank[m] = (monthlyBank[m] || 0) + d.amount;
  }

  const monthlyDB = {};
  for (const r of existingReceipts) {
    const narr = (r.narration || '').toLowerCase();
    if (/course|swar yoga/i.test(narr)) {
      const d = r.date || '';
      const m = d.substring(0, 7);
      monthlyDB[m] = (monthlyDB[m] || 0) + Math.abs(r.amount);
    }
  }

  const allMonths = new Set([...Object.keys(monthlyBank), ...Object.keys(monthlyDB)]);
  const sorted = [...allMonths].sort();
  for (const m of sorted) {
    const bank = monthlyBank[m] || 0;
    const db = monthlyDB[m] || 0;
    const diff = bank - db;
    console.log(`  ${m.padEnd(12)} | Rs.${bank.toFixed(2).padStart(12)} | Rs.${db.toFixed(2).padStart(12)} | Rs.${diff.toFixed(2).padStart(12)} ${Math.abs(diff) > 1 ? '⚠️' : '✅'}`);
  }

  // Show monthly investment comparison
  console.log('');
  console.log('=== MONTHLY INVESTMENT COMPARISON ===');
  const monthlyInvBank = {};
  for (const d of investDeposits) {
    const m = d.date.substring(0, 7);
    monthlyInvBank[m] = (monthlyInvBank[m] || 0) + d.amount;
  }

  const monthlyInvDB = {};
  for (const r of existingReceipts) {
    const narr = (r.narration || '').toLowerCase();
    if (/invest|capital/i.test(narr)) {
      const d = r.date || '';
      const m = d.substring(0, 7);
      monthlyInvDB[m] = (monthlyInvDB[m] || 0) + Math.abs(r.amount);
    }
  }

  const allInvMonths = new Set([...Object.keys(monthlyInvBank), ...Object.keys(monthlyInvDB)]);
  const sortedInv = [...allInvMonths].sort();
  for (const m of sortedInv) {
    const bank = monthlyInvBank[m] || 0;
    const db = monthlyInvDB[m] || 0;
    const diff = bank - db;
    console.log(`  ${m.padEnd(12)} | Rs.${bank.toFixed(2).padStart(12)} | Rs.${db.toFixed(2).padStart(12)} | Rs.${diff.toFixed(2).padStart(12)} ${Math.abs(diff) > 1 ? '⚠️' : '✅'}`);
  }

  // Check "Other" deposits - these are NOT in DB at all
  console.log('');
  console.log('=== OTHER DEPOSITS NOT IN DB (need classification) ===');
  let otherMissing = 0;
  for (const d of otherDeposits) {
    otherMissing += d.amount;
    console.log(`  ${d.date} | Rs.${d.amount.toFixed(2).padStart(12)} | ${d.category.padEnd(25)} | ${d.narration.substring(0, 60)}`);
  }
  console.log(`  TOTAL OTHER: Rs.${otherMissing.toFixed(2)}`);

  await mongoose.disconnect();
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
