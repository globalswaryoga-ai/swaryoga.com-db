/**
 * Find all large deposits (potential investments) from bank statement
 */
const fs = require('fs');

const content = fs.readFileSync('/tmp/bank_statement.txt', 'utf-8');
const lines = content.split('\n');

let txLines = [];
const largeTx = [];

for (const line of lines) {
  const txMatch = line.match(/^\s*(\d+)\s+(\d{2}\s+\w{3}\s+\d{4})/);
  if (txMatch) {
    if (txLines.length > 0) {
      const fullText = txLines.join(' ');
      const amounts = fullText.match(/[\d,]+\.\d{2}/g) || [];
      if (amounts.length >= 2) {
        const deposit = parseFloat(amounts[amounts.length - 2].replace(/,/g, ''));
        if (deposit >= 20000) {
          largeTx.push({ text: fullText.substring(0, 180), deposit });
        }
      }
    }
    txLines = [line];
  } else if (line.trim() && !line.includes('Page') && !line.includes('Statement Generated')) {
    txLines.push(line);
  }
}

// Process last transaction
if (txLines.length > 0) {
  const fullText = txLines.join(' ');
  const amounts = fullText.match(/[\d,]+\.\d{2}/g) || [];
  if (amounts.length >= 2) {
    const deposit = parseFloat(amounts[amounts.length - 2].replace(/,/g, ''));
    if (deposit >= 20000) {
      largeTx.push({ text: fullText.substring(0, 180), deposit });
    }
  }
}

console.log('=== ALL LARGE DEPOSITS (>=20000) ===\n');
let total = 0;
largeTx.forEach((tx, i) => {
  console.log(`${i + 1}. ₹${tx.deposit.toLocaleString()} | ${tx.text}`);
  total += tx.deposit;
});

console.log(`\n=== TOTAL LARGE DEPOSITS: ₹${total.toLocaleString()} ===`);
