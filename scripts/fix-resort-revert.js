const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const col = mongoose.connection.collection('tally_manual_balances');

  // Revert Resort back to ₹3,50,000
  const r = await col.updateOne(
    { financialYear: '2024-25', ledgerName: 'Resort Project (CWIP)' },
    { $set: { amount: 350000, notes: 'Resort Project CWIP ₹3,50,000', updatedAt: new Date() } }
  );
  console.log('Reverted Resort to ₹3,50,000:', r.modifiedCount);

  // Verify
  const entry = await col.findOne({ financialYear: '2024-25', ledgerName: 'Resort Project (CWIP)' });
  console.log('Resort now:', entry.amount);

  await mongoose.disconnect();
})();
