const fs = require('fs');

const text = fs.readFileSync('/tmp/bank_statement.txt', 'utf8');
const lines = text.split('\n');

// Bank statement format (Kotak):
// SN  Date  Description  Ref  Debit  Credit  Balance
// We need to find debit entries (money going out)

const allTxns = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Match lines starting with serial number and date
  const m = line.match(/^\s*(\d+)\s+(\d{2}\s+\w{3}\s+\d{4})\s+(.+)/);
  if (!m) continue;
  
  const sn = parseInt(m[1]);
  const date = m[2];
  let rest = m[3];
  
  // Next line might be continuation of description
  let nextLine = (i + 1 < lines.length) ? lines[i + 1] : '';
  
  // Extract amounts from the line
  // Pattern: description  ref  debit  credit  balance
  // Or: description  ref  debit  balance (no credit)
  // Or: description  ref  credit  balance (no debit)
  
  // Find all numbers that look like amounts (with commas and decimals)
  const amounts = [];
  const amtRegex = /([\d,]+\.\d{2})/g;
  let am;
  while ((am = amtRegex.exec(rest)) !== null) {
    amounts.push({ val: parseFloat(am[1].replace(/,/g, '')), pos: am.index });
  }
  
  if (amounts.length < 2) continue; // Need at least amount + balance
  
  const balance = amounts[amounts.length - 1].val; // Last number is always balance
  
  // For the description, take text before first amount
  const descEnd = amounts[0].pos;
  let desc = rest.substring(0, descEnd).trim();
  
  // Check if it's a debit (2 amounts before balance = debit then credit, but usually only one)
  // In Kotak format: if there are 3 amounts = debit, credit, balance
  // If 2 amounts and description matches debit patterns
  
  if (amounts.length === 2) {
    // Could be debit or credit - need to check context
    const amount = amounts[0].val;
    
    // We'll mark all and determine debit/credit by balance movement
    allTxns.push({ sn, date, desc, amount, balance, lineNum: i });
  } else if (amounts.length >= 3) {
    // Multiple amounts - first is debit, second might be credit
    const debit = amounts[0].val;
    const credit = amounts[1].val;
    if (debit > 0) allTxns.push({ sn, date, desc, amount: debit, type: 'debit', balance, lineNum: i });
  }
}

// Now determine debit vs credit by balance changes
// Sort by serial number
allTxns.sort((a, b) => a.sn - b.sn);

// Opening balance: 37,440.78
let prevBalance = 37440.78;
const debits = [];
const credits = [];

for (const txn of allTxns) {
  const diff = txn.balance - prevBalance;
  if (Math.abs(diff + txn.amount) < 1) {
    // Balance decreased by amount = DEBIT
    txn.type = 'debit';
    debits.push(txn);
  } else if (Math.abs(diff - txn.amount) < 1) {
    // Balance increased by amount = CREDIT
    txn.type = 'credit';
    credits.push(txn);
  } else {
    // Mismatch - might be multi-line or reversal
    txn.type = 'unknown';
  }
  prevBalance = txn.balance;
}

console.log('Total transactions parsed:', allTxns.length);
console.log('Debits:', debits.length, '| Total:', debits.reduce((s, d) => s + d.amount, 0).toFixed(2));
console.log('Credits:', credits.length, '| Total:', credits.reduce((s, d) => s + d.amount, 0).toFixed(2));

console.log('\n=== ALL DEBIT TRANSACTIONS (Money Out) ===');
debits.forEach(d => {
  console.log(`${d.sn}|${d.date}|${d.desc}|${d.amount}`);
});

// Categorize debits
console.log('\n=== CATEGORIZATION ===');
const cats = {};
debits.forEach(d => {
  let cat = 'Miscellaneous';
  const desc = d.desc.toUpperCase();
  
  if (desc.includes('RENT') || desc.includes('HOUSE')) cat = 'Rent';
  else if (desc.includes('SALARY') || desc.includes('SAL ')) cat = 'Salary';
  else if (desc.includes('TRAVEL') || desc.includes('TRAIN') || desc.includes('IRCTC') || desc.includes('RAILWAY') || desc.includes('BUS') || desc.includes('FLIGHT') || desc.includes('KSRTC') || desc.includes('REDBUS')) cat = 'Travelling';
  else if (desc.includes('ELECTRIC') || desc.includes('MSEB') || desc.includes('BESCOM') || desc.includes('POWER')) cat = 'Electricity';
  else if (desc.includes('INTERNET') || desc.includes('BROADBAND') || desc.includes('WIFI') || desc.includes('JIO') || desc.includes('AIRTEL') || desc.includes('VODAFONE') || desc.includes('BSNL')) cat = 'Internet/Phone';
  else if (desc.includes('AMAZON') || desc.includes('FLIPKART') || desc.includes('MYNTRA')) cat = 'Online Shopping';
  else if (desc.includes('SWIGGY') || desc.includes('ZOMATO') || desc.includes('FOOD')) cat = 'Food';
  else if (desc.includes('GOOGLE') || desc.includes('DOMAIN') || desc.includes('HOSTING') || desc.includes('CLOUD') || desc.includes('ZOHO') || desc.includes('RAZORPAY')) cat = 'Software/IT';
  else if (desc.includes('PETROL') || desc.includes('FUEL') || desc.includes('HP ') || desc.includes('BPCL') || desc.includes('IOCL')) cat = 'Fuel';
  else if (desc.includes('MEDICAL') || desc.includes('PHARMA') || desc.includes('HOSPITAL') || desc.includes('DOCTOR')) cat = 'Medical';
  else if (desc.includes('PRINTING') || desc.includes('STATIONERY') || desc.includes('XEROX')) cat = 'Printing';
  else if (desc.includes('ATM') || desc.includes('CASH W')) cat = 'Cash Withdrawal';
  else if (desc.includes('REV-') || desc.includes('REVERSAL')) cat = 'Reversal';
  else if (desc.includes('NEFT') || desc.includes('IMPS') || desc.includes('RTGS')) cat = 'Bank Transfer';
  else if (desc.includes('UPI/')) cat = 'UPI Payment';
  else if (desc.includes('BANK CHG') || desc.includes('CHARGES') || desc.includes('MIN BAL')) cat = 'Bank Charges';
  
  if (!cats[cat]) cats[cat] = { count: 0, total: 0, items: [] };
  cats[cat].count++;
  cats[cat].total += d.amount;
  cats[cat].items.push(d);
});

Object.keys(cats).sort((a, b) => cats[b].total - cats[a].total).forEach(c => {
  console.log(`\n--- ${c}: ${cats[c].count} txns, Rs ${cats[c].total.toFixed(2)} ---`);
  cats[c].items.forEach(d => console.log(`  ${d.sn} | ${d.date} | Rs ${d.amount} | ${d.desc}`));
});
