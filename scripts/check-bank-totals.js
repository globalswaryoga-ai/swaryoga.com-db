/**
 * Parse bank statement and show totals + find the ₹70,000 gap
 */
const fs = require('fs');

const content = fs.readFileSync('/tmp/bank_statement.txt', 'utf-8');
const lines = content.split('\n');

const transactions = [];
let currentTx = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const txMatch = line.match(/^\s*(\d+)\s+(\d{2}\s+\w{3}\s+\d{4})\s+(.+)/);
  if (txMatch) {
    if (currentTx) transactions.push(currentTx);
    currentTx = {
      serial: parseInt(txMatch[1]),
      dateStr: txMatch[2].trim(),
      rest: txMatch[3],
      description: '',
    };
    // Extract amounts from the rest - look for numbers near end
    const nums = txMatch[3].match(/[\d,]+\.\d{2}/g);
    if (nums && nums.length >= 1) {
      currentTx.amounts = nums.map(n => parseFloat(n.replace(/,/g, '')));
    }
  } else if (currentTx) {
    currentTx.description += ' ' + line.trim();
  }
}
if (currentTx) transactions.push(currentTx);

// Parse credits and debits from the statement
// The bank statement format has columns: date, description, ref, withdrawal, deposit, balance  
// Find totals line
let totalDeposits = 0;
let totalWithdrawals = 0;
let creditCount = 0;
let debitCount = 0;

// Look for summary/total lines
for (const line of lines) {
  if (line.includes('Total') || line.includes('TOTAL') || line.includes('Closing')) {
    console.log('Summary line:', line.trim());
  }
}

// Parse each transaction - credit has deposit in 5th col, debit has withdrawal in 4th
// Look at the raw text more carefully
console.log('\n=== First 5 lines ===');
lines.slice(0, 10).forEach((l, i) => console.log(i + ':', l));

console.log('\n=== Last 20 lines ===');
lines.slice(-20).forEach((l, i) => console.log((lines.length - 20 + i) + ':', l));

console.log('\nTotal transactions parsed:', transactions.length);
