/**
 * FY 2024-25 Income Entries Parser
 * Parses bank statement and creates income-only vouchers
 * 
 * Categories:
 * 1. Investment received - Preference Share Capital (investor name ledgers)
 * 2. Swar Yoga Income (course fees, workshops)
 * 3. Bank Interest Received
 * 4. Other Income
 * 5. Contra - Cash to Bank
 * 6. Old Workshop Fees (50,000 + 10,000)
 */

const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: '/Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/.env.local' });

const FY = '2024-25';
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

// Parse the bank statement text file
function parseBankStatement() {
  const content = fs.readFileSync('/tmp/bank_statement.txt', 'utf-8');
  const lines = content.split('\n');
  
  const transactions = [];
  let currentTx = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match transaction lines starting with number, date
    // Format: # Date Description Ref Withdrawal Deposit Balance
    const txMatch = line.match(/^\s*(\d+)\s+(\d{2}\s+\w{3}\s+\d{4})\s+(.+)/);
    
    if (txMatch) {
      if (currentTx) {
        transactions.push(currentTx);
      }
      
      currentTx = {
        serial: parseInt(txMatch[1]),
        dateStr: txMatch[2].trim(),
        rest: txMatch[3],
        description: '',
        ref: '',
        withdrawal: 0,
        deposit: 0,
        balance: 0
      };
      
      // Parse the rest of the line for amounts
      // Look for patterns like "2,500.00" or "37,440.78"
      const amounts = txMatch[3].match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        currentTx.balance = parseFloat(amounts[amounts.length - 1].replace(/,/g, ''));
      }
      if (amounts.length >= 2) {
        // Check if it's a deposit (credit) or withdrawal (debit) based on position
        // Deposit increases balance, withdrawal decreases
        const prevBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 37440.78;
        const amt1 = parseFloat(amounts[0].replace(/,/g, ''));
        
        if (currentTx.balance > prevBalance) {
          currentTx.deposit = amounts.length === 3 ? parseFloat(amounts[1].replace(/,/g, '')) : amt1;
        } else {
          currentTx.withdrawal = amt1;
        }
      }
      if (amounts.length === 3) {
        currentTx.withdrawal = parseFloat(amounts[0].replace(/,/g, ''));
        currentTx.deposit = parseFloat(amounts[1].replace(/,/g, ''));
      }
      
      // Extract description
      const descMatch = txMatch[3].match(/^([A-Z\/\s\-\.\(\)]+)/i);
      if (descMatch) {
        currentTx.description = descMatch[1].trim();
      }
    } else if (currentTx && line.trim() && !line.includes('Page') && !line.includes('Statement Generated')) {
      // Continuation of description
      currentTx.description += ' ' + line.trim();
    }
  }
  
  if (currentTx) {
    transactions.push(currentTx);
  }
  
  return transactions;
}

// Categorize income transactions
function categorizeIncome(transactions) {
  const categories = {
    investments: [],      // NEFT from investors
    swarYogaIncome: [],   // Course fees, workshop fees
    bankInterest: [],     // Interest credited
    otherIncome: [],      // Miscellaneous income
    contraFromCash: [],   // Cash deposits to bank
    oldWorkshopFees: []   // The specific 50000+10000 mentioned
  };
  
  // Only get CREDIT (deposit) transactions
  const credits = transactions.filter(tx => tx.deposit > 0);
  
  console.log(`\nTotal credit transactions: ${credits.length}`);
  
  for (const tx of credits) {
    const desc = tx.description.toUpperCase();
    
    // Investment: NEFT transfers (large amounts from individuals)
    if (desc.includes('NEFT') && tx.deposit >= 25000) {
      // Extract investor name from description
      const nameMatch = tx.description.match(/NEFT\s+\S+\s+([A-Z\s]+)/i);
      const investorName = nameMatch ? nameMatch[1].trim().replace(/\s+HDFC.*|ICIC.*$/i, '').trim() : 'Unknown Investor';
      
      categories.investments.push({
        ...tx,
        investorName,
        parsedDate: parseDate(tx.dateStr)
      });
    }
    // Cash deposit to bank (Contra)
    else if (desc.includes('CASH DEPOSIT')) {
      categories.contraFromCash.push({
        ...tx,
        parsedDate: parseDate(tx.dateStr)
      });
    }
    // Bank Interest
    else if (desc.includes('INT.') || desc.includes('INTEREST') || desc.includes('Int. Pd')) {
      categories.bankInterest.push({
        ...tx,
        parsedDate: parseDate(tx.dateStr)
      });
    }
    // Swar Yoga related income (UPI payments for courses, workshops)
    else if (
      desc.includes('SWAR') || desc.includes('SWARYOG') ||
      desc.includes('YOGA') || desc.includes('LEVEL') ||
      desc.includes('WORKSHOP') || desc.includes('CLASS') ||
      desc.includes('WEIGHT LOSS') || desc.includes('DHYAN') ||
      desc.includes('NAVRATRI') ||
      // Common course-related deposits
      (tx.deposit <= 10000 && desc.includes('UPI'))
    ) {
      categories.swarYogaIncome.push({
        ...tx,
        parsedDate: parseDate(tx.dateStr)
      });
    }
    // Other income (everything else)
    else {
      categories.otherIncome.push({
        ...tx,
        parsedDate: parseDate(tx.dateStr)
      });
    }
  }
  
  return categories;
}

function parseDate(dateStr) {
  // Format: "01 Apr 2024"
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const parts = dateStr.split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = months[parts[1]];
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
  return new Date();
}

async function main() {
  console.log('=== FY 2024-25 Income Entries Parser ===\n');
  
  // Parse bank statement
  console.log('Parsing bank statement...');
  const transactions = parseBankStatement();
  console.log(`Total transactions parsed: ${transactions.length}`);
  
  // Categorize income
  const categories = categorizeIncome(transactions);
  
  // Display summary
  console.log('\n=== INCOME CATEGORIES SUMMARY ===\n');
  
  console.log('1. INVESTMENTS (Preference Share Capital):');
  let totalInvestment = 0;
  for (const inv of categories.investments) {
    console.log(`   ${inv.dateStr} | ${inv.investorName} | ₹${inv.deposit.toLocaleString('en-IN')}`);
    totalInvestment += inv.deposit;
  }
  console.log(`   TOTAL: ₹${totalInvestment.toLocaleString('en-IN')}\n`);
  
  console.log('2. SWAR YOGA INCOME (Course Fees):');
  let totalSwarYoga = 0;
  for (const sy of categories.swarYogaIncome.slice(0, 20)) {
    console.log(`   ${sy.dateStr} | ${sy.description.substring(0, 40)} | ₹${sy.deposit.toLocaleString('en-IN')}`);
    totalSwarYoga += sy.deposit;
  }
  if (categories.swarYogaIncome.length > 20) {
    for (const sy of categories.swarYogaIncome.slice(20)) {
      totalSwarYoga += sy.deposit;
    }
    console.log(`   ... and ${categories.swarYogaIncome.length - 20} more entries`);
  }
  console.log(`   TOTAL: ₹${totalSwarYoga.toLocaleString('en-IN')}\n`);
  
  console.log('3. BANK INTEREST RECEIVED:');
  let totalInterest = 0;
  for (const int of categories.bankInterest) {
    console.log(`   ${int.dateStr} | ${int.description.substring(0, 40)} | ₹${int.deposit.toLocaleString('en-IN')}`);
    totalInterest += int.deposit;
  }
  console.log(`   TOTAL: ₹${totalInterest.toLocaleString('en-IN')}\n`);
  
  console.log('4. CONTRA - CASH TO BANK:');
  let totalContra = 0;
  for (const c of categories.contraFromCash) {
    console.log(`   ${c.dateStr} | ${c.description.substring(0, 40)} | ₹${c.deposit.toLocaleString('en-IN')}`);
    totalContra += c.deposit;
  }
  console.log(`   TOTAL: ₹${totalContra.toLocaleString('en-IN')}\n`);
  
  console.log('5. OTHER INCOME:');
  let totalOther = 0;
  for (const o of categories.otherIncome.slice(0, 15)) {
    console.log(`   ${o.dateStr} | ${o.description.substring(0, 40)} | ₹${o.deposit.toLocaleString('en-IN')}`);
    totalOther += o.deposit;
  }
  if (categories.otherIncome.length > 15) {
    for (const o of categories.otherIncome.slice(15)) {
      totalOther += o.deposit;
    }
    console.log(`   ... and ${categories.otherIncome.length - 15} more entries`);
  }
  console.log(`   TOTAL: ₹${totalOther.toLocaleString('en-IN')}\n`);
  
  const grandTotal = totalInvestment + totalSwarYoga + totalInterest + totalContra + totalOther;
  console.log('=== GRAND TOTAL ALL INCOME ===');
  console.log(`₹${grandTotal.toLocaleString('en-IN')}\n`);
  
  console.log('Opening Balance: ₹37,440.78');
  console.log('Closing Balance: ₹43,750.97');
  console.log(`Net Change: ₹${(43750.97 - 37440.78).toLocaleString('en-IN')}`);
  
  return { categories, grandTotal };
}

main().catch(console.error);
