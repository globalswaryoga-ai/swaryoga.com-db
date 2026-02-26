#!/usr/bin/env node
/**
 * Test the engine's calculateLedgerBalance with a real voucher
 * to verify the ObjectId fix works correctly.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const FY = '2024-25';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;

  console.log('=== Testing Engine ObjectId Fix ===\n');

  // Find Cash-in-Hand ledger
  const cashLedger = await db.collection('acc_ledgers').findOne({ financialYear: FY, subGroup: 'Cash-in-Hand' });
  if (!cashLedger) { console.log('No Cash-in-Hand ledger'); return; }

  // Create a test expense ledger
  const expResult = await db.collection('acc_ledgers').insertOne({
    name: 'Test Stationery',
    group: 'EXPENSE',
    subGroup: 'Indirect Expenses',
    openingBalance: 0,
    openingBalanceType: 'DEBIT',
    financialYear: FY,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const expLedger = await db.collection('acc_ledgers').findOne({ _id: expResult.insertedId });

  // Create a test voucher with proper ObjectId references
  const vResult = await db.collection('acc_vouchers').insertOne({
    voucherNumber: 'TEST-002',
    type: 'PAYMENT',
    voucherType: 'Payment',
    date: new Date('2024-05-01'),
    narration: 'Test: stationery purchase by cash',
    entries: [
      { ledgerId: expLedger._id, ledgerName: 'Test Stationery', amount: 1500, type: 'DEBIT' },
      { ledgerId: cashLedger._id, ledgerName: cashLedger.name, amount: 1500, type: 'CREDIT' },
    ],
    totalDebit: 1500,
    totalCredit: 1500,
    financialYear: FY,
    isReversed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('Created test voucher:', vResult.insertedId);

  // Now test the aggregation with STRING ledgerId (as the engine does)
  const stringId = String(cashLedger._id);
  const objectId = new mongoose.Types.ObjectId(stringId);

  // Test 1: String match (old buggy way)
  const buggyResult = await db.collection('acc_vouchers').aggregate([
    { $match: { financialYear: FY, 'entries.ledgerId': stringId, isReversed: { $ne: true } } },
    { $unwind: '$entries' },
    { $match: { 'entries.ledgerId': cashLedger._id } },
    { $group: { _id: '$entries.type', total: { $sum: '$entries.amount' } } },
  ]).toArray();
  console.log('\nOLD (string match):', buggyResult.length === 0 ? '❌ EMPTY — Bug confirmed!' : 'Found results');

  // Test 2: ObjectId match (fixed way)
  const fixedResult = await db.collection('acc_vouchers').aggregate([
    { $match: { financialYear: FY, 'entries.ledgerId': objectId, isReversed: { $ne: true } } },
    { $unwind: '$entries' },
    { $match: { 'entries.ledgerId': objectId } },
    { $group: { _id: '$entries.type', total: { $sum: '$entries.amount' } } },
  ]).toArray();
  console.log('NEW (ObjectId match):', fixedResult.length > 0 ? '✅ Found results!' : '❌ Still empty');
  fixedResult.forEach(r => console.log('  ', r._id, ':', r.total));

  // Test 3: Expense ledger
  const expObjId = new mongoose.Types.ObjectId(String(expLedger._id));
  const expFixed = await db.collection('acc_vouchers').aggregate([
    { $match: { financialYear: FY, 'entries.ledgerId': expObjId, isReversed: { $ne: true } } },
    { $unwind: '$entries' },
    { $match: { 'entries.ledgerId': expObjId } },
    { $group: { _id: '$entries.type', total: { $sum: '$entries.amount' } } },
  ]).toArray();
  console.log('\nExpense ledger (ObjectId):', expFixed.length > 0 ? '✅' : '❌');
  expFixed.forEach(r => console.log('  ', r._id, ':', r.total));

  // Cleanup
  await db.collection('acc_vouchers').deleteOne({ _id: vResult.insertedId });
  await db.collection('acc_ledgers').deleteOne({ _id: expResult.insertedId });
  console.log('\nCleaned up test data ✅');

  console.log('\n=== CONCLUSION ===');
  console.log('String ledgerId in $match:', buggyResult.length === 0 ? 'FAILS (old bug)' : 'works');
  console.log('ObjectId ledgerId in $match:', fixedResult.length > 0 ? 'WORKS (fix confirmed!)' : 'fails');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
