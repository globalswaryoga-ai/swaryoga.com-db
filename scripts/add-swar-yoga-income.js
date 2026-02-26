/**
 * Add Swar Yoga Income entries from bank statement
 * All UPI/IMPS credits that are NOT investments, contra, or workshop fees
 */
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const FY = '2024-25';
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

// Known investment refs to exclude
const INVESTMENT_REFS = [
  'NEFT N108242993421355', 'NEFT N148243058243433', 'NEFT HS92412442414963',
  'NEFT HS92416446945957', 'NEFT CBINH24247836349', 'NEFT N317243393965957',
  'NEFT SBIN425079742803', 'UPI-411055796148', 'UPI-411426085408', 'UPI-420957501199',
  'UPI-411053184685', 'UPI-414404647836', 'UPI-423520149310', 'IMPS-420620809664',
  'UPI-423633552631', 'NEFT HS92423654763406', 'UPI-424799986143', 'UPI-424733656204',
  'IMPS-431022501107', 'MB-998671481067'
];

// Known contra refs to exclude
const CONTRA_REFS = ['CASH DEPOSIT BY SMITA', 'CASH DEPOSIT BY SELF'];

// Parse bank statement and get Swar Yoga income transactions
function parseSwarYogaIncome() {
  const content = fs.readFileSync('/tmp/bank_statement.txt', 'utf-8');
  const lines = content.split('\n');
  
  const swarYogaIncome = [];
  let txLines = [];
  let prevBalance = 37440.78;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const txMatch = line.match(/^\s*(\d+)\s+(\d{2}\s+\w{3}\s+\d{4})/);
    
    if (txMatch) {
      if (txLines.length > 0) {
        const fullText = txLines.join(' ');
        const amounts = fullText.match(/[\d,]+\.\d{2}/g) || [];
        
        if (amounts.length >= 2) {
          const balance = parseFloat(amounts[amounts.length - 1].replace(/,/g, ''));
          let deposit = 0;
          
          // If balance increased, it's a credit
          if (balance > prevBalance) {
            if (amounts.length === 2) {
              deposit = parseFloat(amounts[0].replace(/,/g, ''));
            } else if (amounts.length === 3) {
              deposit = parseFloat(amounts[1].replace(/,/g, ''));
            }
            
            // Check if this is NOT an investment or contra
            const isInvestment = INVESTMENT_REFS.some(ref => fullText.includes(ref));
            const isContra = CONTRA_REFS.some(ref => fullText.toUpperCase().includes(ref));
            const isLargeNEFT = fullText.includes('NEFT') && deposit >= 25000;
            
            if (!isInvestment && !isContra && !isLargeNEFT && deposit > 0) {
              // Extract date
              const dateMatch = fullText.match(/(\d{2}\s+\w{3}\s+\d{4})/);
              const dateStr = dateMatch ? dateMatch[1] : '';
              
              // Extract description
              const descMatch = fullText.match(/UPI\/([^\/]+)/i) || fullText.match(/IMPS\/([^\/]+)/i) || fullText.match(/Recd.*?\/([^\/]+)/i);
              const payer = descMatch ? descMatch[1].trim().substring(0, 30) : 'UPI Payment';
              
              swarYogaIncome.push({
                date: parseDate(dateStr),
                dateStr,
                amount: deposit,
                payer,
                fullText: fullText.substring(0, 100)
              });
            }
          }
          prevBalance = balance;
        }
      }
      txLines = [line];
    } else if (line.trim() && !line.includes('Page') && !line.includes('Statement Generated')) {
      txLines.push(line);
    }
  }
  
  return swarYogaIncome;
}

function parseDate(dateStr) {
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  const parts = dateStr.split(/\s+/);
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
  }
  return new Date('2024-04-01');
}

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  await mongoose.connect(uri, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('ADDING SWAR YOGA INCOME ENTRIES - FY 2024-25');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Parse Swar Yoga income from bank statement
  const swarYogaIncome = parseSwarYogaIncome();
  console.log(`Found ${swarYogaIncome.length} Swar Yoga Income transactions\n`);
  
  // Create vouchers
  let voucherNum = 1;
  let totalIncome = 0;
  
  console.log('Creating Swar Yoga Income Vouchers:');
  for (const tx of swarYogaIncome) {
    totalIncome += tx.amount;
    
    const voucher = {
      voucherNumber: `SY-2425-${String(voucherNum).padStart(3, '0')}`,
      type: 'RECEIPT',
      date: tx.date,
      narration: `Swar Yoga Income - ${tx.payer}`,
      financialYear: FY,
      entries: [
        { ledgerName: 'Kotak Mahindra Bank', type: 'DEBIT', amount: tx.amount },
        { ledgerName: 'Swar Yoga Income', type: 'CREDIT', amount: tx.amount },
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('acc_vouchers').insertOne(voucher);
    console.log(`  ${voucher.voucherNumber} | ${tx.dateStr} | Rs ${tx.amount.toLocaleString()} | ${tx.payer}`);
    voucherNum++;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`TOTAL SWAR YOGA INCOME: Rs ${totalIncome.toLocaleString()}`);
  console.log(`Vouchers Created: ${voucherNum - 1}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Final count
  const finalVouchers = await db.collection('acc_vouchers').countDocuments({ financialYear: FY });
  console.log(`Total FY 2024-25 Vouchers: ${finalVouchers}`);
  
  await mongoose.disconnect();
}

main().catch(console.error);
