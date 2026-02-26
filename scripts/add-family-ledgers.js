/**
 * Add family member ledger accounts under their proper Tally groups
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const b = mongoose.connection.collection('tally_manual_balances');

  const newLedgers = [
    // Directors → Capital Account (liability)
    { ledgerName: 'Mohan Kalburgi', parentGroup: 'Capital Account', category: 'liability', amount: 0, drCr: 'Cr', financialYear: '2024-25', notes: 'Director' },
    { ledgerName: 'Upamanyu Kalburgi', parentGroup: 'Capital Account', category: 'liability', amount: 0, drCr: 'Cr', financialYear: '2024-25', notes: 'Director' },
    
    // Teachers → Sundry Creditors (liability)
    { ledgerName: 'Laxmi Kalburgi', parentGroup: 'Sundry Creditors', category: 'liability', amount: 0, drCr: 'Cr', financialYear: '2024-25', notes: 'Teacher' },
    { ledgerName: 'Turya Kalburgi', parentGroup: 'Sundry Creditors', category: 'liability', amount: 0, drCr: 'Cr', financialYear: '2024-25', notes: 'Teacher' },
    
    // Pandurang Kalburgi → Direct Expenses (expense)
    { ledgerName: 'Pandurang Kalburgi', parentGroup: 'Direct Expenses', category: 'expense', amount: 0, drCr: 'Dr', financialYear: '2024-25', notes: 'Expense' },
  ];

  // Check if any already exist
  for (const l of newLedgers) {
    const exists = await b.findOne({ financialYear: '2024-25', ledgerName: l.ledgerName });
    if (exists) {
      console.log('⚠️  Already exists: ' + l.ledgerName + ' (' + exists.parentGroup + ')');
    } else {
      const result = await b.insertOne({
        ...l,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Added: ' + l.ledgerName + ' → ' + l.parentGroup + ' (' + l.category + ')');
    }
  }

  // Verify
  console.log('\n── ALL LEDGERS NOW ──');
  const all = await b.find({ financialYear: '2024-25' }).sort({ category: 1, parentGroup: 1, ledgerName: 1 }).toArray();
  for (const e of all) {
    console.log('  [' + e.category + '] ' + (e.parentGroup || '').padEnd(28) + '| ' + e.ledgerName + (e.amount ? ' = Rs.' + e.amount : ''));
  }
  console.log('Total:', all.length);

  await mongoose.disconnect();
}
run();
