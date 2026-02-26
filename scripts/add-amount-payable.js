const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const col = db.collection('tally_manual_balances');

  // Add Amount Payable - 1L liability from 23-24
  const entry = {
    ledgerName: 'Amount Payable',
    parentGroup: 'Sundry Creditors',
    category: 'Balance Sheet',
    amount: 100000,
    drCr: 'Cr',
    financialYear: '2024-25',
    asOnDate: '2025-03-31',
    notes: 'Carry forward from FY 2023-24. Amount payable.',
    createdBy: 'script',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await col.insertOne(entry);
  console.log('Inserted Amount Payable ₹1,00,000 (Cr) -', result.insertedId);

  // Verify
  const check = await col.findOne({ _id: result.insertedId });
  console.log('Verified:', check.ledgerName, '₹' + check.amount, check.drCr, '-', check.parentGroup);

  await client.close();
}
main().catch(console.error);
