/**
 * Add Fees Receivable entry for FY 2024-25
 * Opening: ₹1,11,769 (from 23-24)
 * Collected: ₹60,000 (Nepal dues)
 * Closing: ₹51,769
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const b = mongoose.connection.collection('tally_manual_balances');

  // Check if entry already exists
  const existing = await b.findOne({ financialYear: '2024-25', ledgerName: 'Fees Receivable' });
  if (existing) {
    console.log('Fees Receivable already exists:', existing.amount, existing.drCr);
    console.log('Updating to ₹51,769...');
    await b.updateOne({ _id: existing._id }, { $set: { amount: 51769, updatedAt: new Date() } });
    console.log('✅ Updated');
  } else {
    console.log('Adding Fees Receivable = ₹51,769 (Dr) for FY 2024-25...');
    await b.insertOne({
      ledgerName: 'Fees Receivable',
      parentGroup: 'Current Assets',
      category: 'asset',
      amount: 51769,
      drCr: 'Dr',
      financialYear: '2024-25',
      asOnDate: '31-03-2025',
      notes: 'Opening ₹1,11,769 - ₹60,000 Nepal dues collected = ₹51,769',
      createdBy: 'fix-fy2425-final',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Inserted');
  }

  // Verify
  const verify = await b.findOne({ financialYear: '2024-25', ledgerName: 'Fees Receivable' });
  console.log('Verified:', verify.ledgerName, '=', verify.amount, verify.drCr);

  await mongoose.disconnect();
}
run();
