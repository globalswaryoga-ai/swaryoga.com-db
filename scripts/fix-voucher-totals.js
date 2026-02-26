#!/usr/bin/env node
/**
 * Fix vouchers missing totalDebit and totalCredit fields
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  console.log(`Found ${vouchers.length} vouchers to fix`);
  
  let fixed = 0;
  for (const v of vouchers) {
    const totalDebit = v.entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + (e.amount || 0), 0);
    const totalCredit = v.entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + (e.amount || 0), 0);
    
    await db.collection('acc_vouchers').updateOne(
      { _id: v._id },
      { $set: { totalDebit, totalCredit } }
    );
    fixed++;
  }
  
  console.log(`Fixed ${fixed} vouchers with totalDebit/totalCredit`);
  
  // Verify
  const sample = await db.collection('acc_vouchers').findOne({ voucherNumber: 'SY-2425-144' });
  console.log('Sample - totalDebit:', sample.totalDebit, 'totalCredit:', sample.totalCredit);
  
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
