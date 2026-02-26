const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const col = client.db('swaryoga_admin_crm').collection('tally_manual_balances');

  const course = await col.findOne({ ledgerName: 'Course Fees', financialYear: '2024-25' });
  const cash = await col.findOne({ ledgerName: 'Cash Account', financialYear: '2024-25' });
  const ap = await col.find({ ledgerName: 'Amount Payable', financialYear: '2024-25' }).toArray();

  console.log('Course Fees:', course.amount);
  console.log('Cash Account:', cash.amount);
  console.log('Amount Payable entries:', ap.length);
  ap.forEach(x => console.log('  -', x.amount, x.drCr));

  // Expected: Course Fees = 550773 + 2L = 750773 (original was 450773, +1L script, +1L broken terminal?, +1L now)
  // Need to verify. Original was 450773. We added 1L (script add-1l-cash-income.js) = 550773
  // Then broken terminal may have added another 1L = 650773
  // Then this script added 1L more = 750773
  // We want total 2L added = 650773
  
  console.log('\nExpected Course Fees: 650772.81 (450773 + 2L)');
  console.log('Actual:', course.amount);
  if (Math.abs(course.amount - 650772.81) > 1) {
    console.log('MISMATCH - needs fix');
    console.log('Difference:', course.amount - 650772.81);
  } else {
    console.log('OK');
  }

  console.log('\nExpected Cash Account: 313886 (113886 + 2L)');
  console.log('Actual:', cash.amount);
  if (Math.abs(cash.amount - 313886) > 1) {
    console.log('MISMATCH - needs fix');
    console.log('Difference:', cash.amount - 313886);
  } else {
    console.log('OK');
  }

  await client.close();
})();
