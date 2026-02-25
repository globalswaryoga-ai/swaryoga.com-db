/**
 * Parse Kotak Bank Statement (Sheet1) — Full analysis
 * Columns: DATE | MONTH | narration | chq | amount | EXP | INCOME DETAILS | balance
 * Run: node scripts/analyze-bank-statement.js
 */
const XLSX = require('xlsx');

const wb = XLSX.readFile('/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx');
const ws = wb.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log(`Total rows: ${data.length}\n`);

// Headers: Row 0 = DATE | MONTH | narration | chq | amount | EXP | INCOME DETAILS | balance
const headers = data[0];
console.log('Headers:', headers);

// Parse amount — can be "2,500.00(Cr)" or "2500" or "2,500.00(Dr)"
function parseAmount(val) {
  if (val === null || val === undefined || val === '') return { amount: 0, type: null };
  const s = String(val).trim();
  const isCr = s.includes('(Cr)');
  const isDr = s.includes('(Dr)');
  const num = parseFloat(s.replace(/,/g, '').replace(/\(Cr\)|\(Dr\)/g, ''));
  if (isNaN(num)) return { amount: 0, type: null };
  return { amount: num, type: isCr ? 'Cr' : (isDr ? 'Dr' : 'expense') };
}

// Categorize
const expenseCategories = {};
const incomeCategories = {};
let totalExpenses = 0;
let totalIncome = 0;
let totalContra = 0;
const contraEntries = [];
const unknownEntries = [];

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length < 6) continue;
  
  const date = row[0];
  const month = row[1];
  const narration = row[2] || '';
  const chq = row[3] || '';
  const amountRaw = row[4];
  const expType = (row[5] || '').toString().trim();
  const incomeType = (row[6] || '').toString().trim();
  const balance = row[7];
  
  const { amount, type } = parseAmount(amountRaw);
  if (amount === 0) continue;
  
  if (incomeType && type === 'Cr') {
    // Income
    if (!incomeCategories[incomeType]) incomeCategories[incomeType] = { count: 0, total: 0 };
    incomeCategories[incomeType].count++;
    incomeCategories[incomeType].total += amount;
    totalIncome += amount;
  } else if (expType) {
    // Check if it's a contra/transfer
    const expUpper = expType.toUpperCase();
    if (expUpper.includes('CONTRA') || expUpper.includes('BANK TRANSFER') || expUpper.includes('CASH DEPOSIT')) {
      totalContra += amount;
      contraEntries.push({ date, expType, amount, narration: String(narration).substring(0, 50) });
    } else {
      // Regular expense
      if (!expenseCategories[expType]) expenseCategories[expType] = { count: 0, total: 0 };
      expenseCategories[expType].count++;
      expenseCategories[expType].total += amount;
      totalExpenses += amount;
    }
  } else if (type === 'Cr' && !incomeType) {
    // Credit without income label
    unknownEntries.push({ date, amount, narration: String(narration).substring(0, 60), type: 'Cr' });
  } else if (!expType && !incomeType && amount > 0) {
    unknownEntries.push({ date, amount, narration: String(narration).substring(0, 60), type: 'unknown' });
  }
}

// Display
console.log('\n' + '═'.repeat(80));
console.log('  EXPENSE CATEGORIES (from Bank Statement)');
console.log('═'.repeat(80));
const sortedExp = Object.entries(expenseCategories).sort((a, b) => b[1].total - a[1].total);
sortedExp.forEach(([cat, data]) => {
  console.log(`  ${cat.padEnd(40)} Count: ${String(data.count).padStart(4)} | Rs.${data.total.toLocaleString('en-IN').padStart(12)}`);
});
console.log(`  ${'─'.repeat(70)}`);
console.log(`  ${'TOTAL EXPENSES'.padEnd(40)}                  Rs.${totalExpenses.toLocaleString('en-IN').padStart(12)}`);

console.log('\n' + '═'.repeat(80));
console.log('  INCOME CATEGORIES (from Bank Statement)');
console.log('═'.repeat(80));
const sortedInc = Object.entries(incomeCategories).sort((a, b) => b[1].total - a[1].total);
sortedInc.forEach(([cat, data]) => {
  console.log(`  ${cat.padEnd(40)} Count: ${String(data.count).padStart(4)} | Rs.${data.total.toLocaleString('en-IN').padStart(12)}`);
});
console.log(`  ${'─'.repeat(70)}`);
console.log(`  ${'TOTAL INCOME'.padEnd(40)}                  Rs.${totalIncome.toLocaleString('en-IN').padStart(12)}`);

console.log('\n' + '═'.repeat(80));
console.log('  CONTRA/TRANSFERS');
console.log('═'.repeat(80));
console.log(`  Total Contra: Rs.${totalContra.toLocaleString('en-IN')}`);
contraEntries.forEach(c => {
  console.log(`  ${c.expType.padEnd(25)} Rs.${c.amount.toLocaleString('en-IN').padStart(10)} | ${c.narration}`);
});

if (unknownEntries.length > 0) {
  console.log('\n' + '═'.repeat(80));
  console.log('  UNCATEGORIZED ENTRIES');
  console.log('═'.repeat(80));
  unknownEntries.forEach(u => {
    console.log(`  ${u.type} Rs.${u.amount.toLocaleString('en-IN').padStart(10)} | ${u.narration}`);
  });
}

// Summary comparison
console.log('\n' + '═'.repeat(80));
console.log('  BANK STATEMENT vs DB COMPARISON');
console.log('═'.repeat(80));
console.log(`  Bank Statement Income:   Rs.${totalIncome.toLocaleString('en-IN')}`);
console.log(`  Bank Statement Expenses: Rs.${totalExpenses.toLocaleString('en-IN')}`);
console.log(`  Bank Statement Contras:  Rs.${totalContra.toLocaleString('en-IN')}`);
console.log(`  Net (Income - Exp):      Rs.${(totalIncome - totalExpenses).toLocaleString('en-IN')}`);
console.log(`  \n  DB Income:               Rs.11,69,286.72`);
console.log(`  DB Expenses (no dep):    Rs.7,94,421`);
console.log(`  DB Net:                  Rs.3,74,865.72`);

// First and last balance
const firstBalance = data[1] ? parseAmount(data[1][7]) : null;
const lastRow = data[data.length - 1];
const lastBalance = lastRow ? parseAmount(lastRow[7]) : null;
console.log(`\n  First balance: Rs.${firstBalance?.amount.toLocaleString('en-IN')}`);
console.log(`  Last balance:  Rs.${lastBalance?.amount.toLocaleString('en-IN')}`);
