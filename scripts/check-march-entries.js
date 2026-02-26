const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  
  // Check balances for FY 2023-24
  const balances = await db.collection('tally_manual_balances').find({ financialYear: '2023-24' }).toArray();
  console.log('=== FY 2023-24 Balances ===');
  console.log('Count:', balances.length);
  balances.forEach(b => {
    console.log(`  ${b.ledgerName} | ${b.category} | ${b.drCr} | Rs.${b.amount} | asOnDate: ${b.asOnDate}`);
  });
  
  // Check vouchers around March 30, 2024
  const vouchers = await db.collection('tally_manual_vouchers').find({
    voucherDate: { 
      $gte: new Date('2024-03-01'), 
      $lte: new Date('2024-03-31') 
    }
  }).toArray();
  console.log('\n=== Vouchers in March 2024 ===');
  console.log('Count:', vouchers.length);
  vouchers.forEach(v => {
    console.log(`  ${v.voucherDate?.toISOString()?.split('T')[0]} | ${v.voucherType} | ${v.partyName} | Rs.${v.amount}`);
  });

  // Check ALL vouchers for FY 2023-24
  const allVouchers2324 = await db.collection('tally_manual_vouchers').find({
    voucherDate: { 
      $gte: new Date('2023-04-01'), 
      $lte: new Date('2024-03-31') 
    }
  }).toArray();
  console.log('\n=== All Vouchers FY 2023-24 ===');
  console.log('Count:', allVouchers2324.length);
  
  // Check FY 2024-25 vouchers on March 30/31
  const marchVouchers25 = await db.collection('tally_manual_vouchers').find({
    voucherDate: { 
      $gte: new Date('2025-03-28'), 
      $lte: new Date('2025-03-31') 
    }
  }).toArray();
  console.log('\n=== FY 2024-25 Vouchers around March 28-31 ===');
  console.log('Count:', marchVouchers25.length);
  marchVouchers25.forEach(v => {
    console.log(`  ${v.voucherDate?.toISOString()?.split('T')[0]} | ${v.voucherType} | ${v.partyName} | Rs.${v.amount}`);
  });

  // Check FY 2024-25 balances  
  const balances25 = await db.collection('tally_manual_balances').find({ financialYear: '2024-25' }).toArray();
  console.log('\n=== FY 2024-25 Balances ===');
  console.log('Count:', balances25.length);
  balances25.forEach(b => {
    console.log(`  ${b.ledgerName} | ${b.category} | ${b.drCr} | Rs.${b.amount} | asOnDate: ${b.asOnDate}`);
  });
  
  await mongoose.disconnect();
}
check();
