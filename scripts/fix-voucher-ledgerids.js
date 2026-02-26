/**
 * Fix income vouchers - Add ledgerId to entries
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const FY = '2024-25';
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  await mongoose.connect(uri, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('FIXING INCOME VOUCHERS - Adding ledgerId to entries');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Get all ledgers for lookup
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: FY }).toArray();
  const ledgerMap = {};
  ledgers.forEach(l => {
    ledgerMap[l.name] = l._id;
  });
  
  console.log(`Found ${ledgers.length} ledgers for FY ${FY}`);
  console.log('Ledger names:', Object.keys(ledgerMap).join(', '));
  
  // Get all vouchers that need fixing (non-DEP vouchers)
  const vouchers = await db.collection('acc_vouchers').find({
    financialYear: FY,
    voucherNumber: { $not: /^DEP-/ }
  }).toArray();
  
  console.log(`\nFound ${vouchers.length} vouchers to fix\n`);
  
  let fixed = 0;
  let errors = 0;
  
  for (const voucher of vouchers) {
    const newEntries = [];
    let hasError = false;
    
    for (const entry of voucher.entries) {
      const ledgerId = ledgerMap[entry.ledgerName];
      if (!ledgerId) {
        console.log(`  ERROR: Ledger not found: "${entry.ledgerName}" in voucher ${voucher.voucherNumber}`);
        hasError = true;
        break;
      }
      newEntries.push({
        ledgerId: ledgerId,
        ledgerName: entry.ledgerName,
        amount: entry.amount,
        type: entry.type
      });
    }
    
    if (hasError) {
      errors++;
      continue;
    }
    
    // Update the voucher
    await db.collection('acc_vouchers').updateOne(
      { _id: voucher._id },
      { $set: { entries: newEntries, updatedAt: new Date() } }
    );
    fixed++;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`Fixed: ${fixed} vouchers`);
  console.log(`Errors: ${errors} vouchers`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Verify fix
  const sample = await db.collection('acc_vouchers').findOne({
    financialYear: FY,
    voucherNumber: /^SY-/
  });
  
  if (sample) {
    console.log('Sample fixed voucher:');
    console.log(JSON.stringify(sample, null, 2));
  }
  
  await mongoose.disconnect();
}

main().catch(console.error);
