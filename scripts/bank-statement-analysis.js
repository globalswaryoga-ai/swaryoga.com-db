/**
 * Complete bank statement analysis
 * Parse every credit/deposit from the bank statement to find exact totals
 */
const fs = require('fs');

const content = fs.readFileSync('/tmp/bank_statement.txt', 'utf-8');
const lines = content.split('\n');

// The statement format: each transaction starts with a serial number
// Columns: Serial | Date | Description | Ref | Withdrawal | Deposit | Balance
// Credits have deposit amount, debits have withdrawal amount

const transactions = [];
let currentTx = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Match: serial_number date(dd Mon yyyy) rest_of_line
  const txMatch = line.match(/^\s*(\d{1,3})\s+(\d{2}\s+\w{3}\s+\d{4})\s+(.+)/);
  
  if (txMatch) {
    if (currentTx) transactions.push(currentTx);
    
    const serial = parseInt(txMatch[1]);
    const dateStr = txMatch[2].trim();
    const rest = txMatch[3];
    
    // Extract all monetary amounts from the rest of the line (format: X,XXX.XX)
    const amounts = [];
    const amountRegex = /(\d{1,3}(?:,\d{2,3})*\.\d{2})/g;
    let match;
    while ((match = amountRegex.exec(rest)) !== null) {
      amounts.push(parseFloat(match[1].replace(/,/g, '')));
    }
    
    // Last amount is always balance
    // If 3 amounts: withdrawal, deposit, balance (but usually only one of first two exists)
    // Look at raw to determine if credit or debit
    // The position of amounts in the line matters
    
    currentTx = {
      serial,
      dateStr,
      description: rest.split(/\d{1,3}(?:,\d{2,3})*\.\d{2}/)[0].trim(),
      amounts,
      rawLine: line,
    };
  } else if (currentTx && line.trim()) {
    currentTx.description += ' ' + line.trim();
  }
}
if (currentTx) transactions.push(currentTx);

console.log('Total transactions:', transactions.length);

// Now determine credits vs debits
// Bank statement: if deposit column has value = credit; if withdrawal = debit
// The text format positions amounts differently
// Let's look at the structure more carefully

// Opening balance: 37,440.78
// Closing balance: 43,750.97
// Net change: 43,750.97 - 37,440.78 = 6,310.19 (more deposits than withdrawals)

let totalCredits = 0;
let totalDebits = 0;
let creditCount = 0;
let debitCount = 0;
const credits = [];

for (const tx of transactions) {
  if (tx.amounts.length < 2) continue;
  
  const balance = tx.amounts[tx.amounts.length - 1];
  
  // If only 2 amounts: one is withdrawal OR deposit, other is balance
  // Check previous balance to determine
  const prevTx = transactions[transactions.indexOf(tx) - 1];
  const prevBalance = prevTx ? prevTx.amounts[prevTx.amounts.length - 1] : 37440.78;
  
  if (tx.amounts.length === 2) {
    const amount = tx.amounts[0];
    if (balance > prevBalance) {
      // Deposit (credit)
      totalCredits += amount;
      creditCount++;
      credits.push({ serial: tx.serial, date: tx.dateStr, amount, desc: tx.description.substring(0, 60) });
    } else {
      // Withdrawal (debit)
      totalDebits += amount;
      debitCount++;
    }
  } else if (tx.amounts.length === 3) {
    // Both withdrawal and deposit columns present (rare)
    // Usually one is 0 or the format is: withdrawal, deposit, balance
    if (balance > prevBalance) {
      totalCredits += tx.amounts[1];
      creditCount++;
      credits.push({ serial: tx.serial, date: tx.dateStr, amount: tx.amounts[1], desc: tx.description.substring(0, 60) });
    } else {
      totalDebits += tx.amounts[0];
      debitCount++;
    }
  }
}

console.log('\n=== BANK STATEMENT TOTALS ===');
console.log('Opening Balance: Rs', 37440.78);
console.log('Total Credits (Deposits):', creditCount, 'transactions, Rs', totalCredits.toFixed(2));
console.log('Total Debits (Withdrawals):', debitCount, 'transactions, Rs', totalDebits.toFixed(2));
console.log('Net:', (totalCredits - totalDebits).toFixed(2));
console.log('Expected Closing:', (37440.78 + totalCredits - totalDebits).toFixed(2));
console.log('Actual Closing: Rs 43,750.97');

console.log('\n=== ALL CREDIT TRANSACTIONS ===');
credits.forEach(c => console.log(`  #${c.serial} | ${c.date} | Rs ${c.amount.toFixed(2)} | ${c.desc}`));

console.log('\n=== CHECKING AGAINST VOUCHERS ===');
console.log('Total bank credits from statement:', totalCredits.toFixed(2));
console.log('Total in acc_vouchers (Receipt+Contra Dr Kotak):', 1296896.72);
console.log('Difference:', (totalCredits - 1296896.72).toFixed(2));
