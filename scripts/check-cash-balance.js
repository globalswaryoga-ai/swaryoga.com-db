const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const col = db.collection('tally_manual_balances');

  // Check cash in both years
  console.log('=== CASH ACCOUNTS ===');
  
  const cash2324 = await col.findOne({ financialYear: '2023-24', ledgerName: /cash/i });
  if (cash2324) {
    console.log('FY 23-24: ' + cash2324.ledgerName + ' | ' + cash2324.parentGroup + ' | ' + cash2324.drCr + ' | Rs.' + cash2324.amount);
  } else {
    console.log('FY 23-24: No cash entry found');
  }

  const cash2425 = await col.findOne({ financialYear: '2024-25', ledgerName: /cash/i });
  if (cash2425) {
    console.log('FY 24-25: ' + cash2425.ledgerName + ' | ' + cash2425.parentGroup + ' | ' + cash2425.drCr + ' | Rs.' + cash2425.amount);
  } else {
    console.log('FY 24-25: No cash entry found');
  }

  // Calculate what cash should be
  console.log('\n=== CASH CALCULATION ===');
  const openingCash = cash2324 ? cash2324.amount : 0;
  console.log('Opening Cash (from 23-24): Rs.' + openingCash);
  
  // Cash income Oct-15: ₹90,000
  const cashIncome = 90000;
  console.log('+ Cash Income (Oct-15, 40 students): Rs.' + cashIncome);
  
  // Contra: Cash deposited to bank ₹8,000
  const cashToBank = 8000;
  console.log('- Cash deposited to bank (Contra): Rs.' + cashToBank);
  
  const expectedCash = openingCash + cashIncome - cashToBank;
  console.log('= Expected Cash Balance: Rs.' + expectedCash);
  console.log('  Current in DB: Rs.' + (cash2425 ? cash2425.amount : 0));
  console.log('  Difference: Rs.' + (expectedCash - (cash2425 ? cash2425.amount : 0)));

  await client.close();
})();
