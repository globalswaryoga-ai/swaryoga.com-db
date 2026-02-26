require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const col = db.collection('tally_manual_vouchers');
  
  const doc = {
    voucherType: 'Receipt',
    voucherNumber: '',
    date: '2024-10-01',
    partyName: 'Class Students (40 people)',
    ledgerName: 'Course Fees',
    amount: 90000,
    narration: 'Cash received for class - Oct 2024, 40 students',
    paymentMode: 'Cash',
    financialYear: '2024-25',
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const result = await col.insertOne(doc);
  console.log('Inserted:', result.insertedId);
  
  const count = await col.countDocuments({ financialYear: '2024-25', voucherType: 'Receipt' });
  console.log('Total Receipt vouchers for FY 2024-25:', count);
  
  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
