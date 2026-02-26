/**
 * Fix FY 2024-25: Investment is capital, not income
 * 
 * Problem: Course Fees was set to ₹10,79,287 which incorrectly included
 * investment money. Actual course fee receipts = ₹3,43,216.
 * Investment ₹8,61,008 is already on BS as "Unsecured Loans".
 * 
 * Also update P&L Account entry to reflect the correct net loss.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const col = mongoose.connection.collection('tally_manual_balances');

  // Current wrong values
  const courseFeeEntry = await col.findOne({ financialYear: '2024-25', ledgerName: 'Course Fees' });
  console.log('Current Course Fees:', courseFeeEntry?.amount);

  const plEntry = await col.findOne({ financialYear: '2024-25', ledgerName: 'Profit & Loss Account' });
  console.log('Current P&L Account:', plEntry?.amount, plEntry?.drCr);

  // Correct Course Fees = actual course fee vouchers only
  // From voucher data: 7 monthly course fee receipts = ₹3,43,216.48
  const correctCourseFees = 343216;

  // Get total expenses from balance entries
  const allEntries = await col.find({ financialYear: '2024-25' }).toArray();
  let totalExpenses = 0;
  for (const e of allEntries) {
    if ((e.category || '').toLowerCase() === 'expense') {
      totalExpenses += Math.abs(e.amount || 0);
    }
  }
  console.log('\nTotal Expenses (from balance entries):', totalExpenses);
  console.log('Correct Course Fees:', correctCourseFees);
  
  // Net Profit/Loss = Income - Expenses
  const netPL = correctCourseFees - totalExpenses;
  console.log('Net P&L (current year):', netPL);
  
  // P&L Account = Opening loss (-45,192) + Current year P&L
  const openingLoss = -45192;
  const closingPL = openingLoss + netPL;
  console.log('Opening P&L:', openingLoss);
  console.log('Closing P&L Account:', closingPL);
  // If closingPL is negative, it's a Dr balance (loss accumulated)
  const plDrCr = closingPL < 0 ? 'Dr' : 'Cr';
  console.log('P&L DrCr:', plDrCr);

  // Update Course Fees
  const r1 = await col.updateOne(
    { financialYear: '2024-25', ledgerName: 'Course Fees' },
    { $set: { 
      amount: correctCourseFees,
      notes: 'Course fee receipts only (excl. investment capital) — from voucher data'
    }}
  );
  console.log('\nUpdated Course Fees:', r1.modifiedCount);

  // Update P&L Account
  const r2 = await col.updateOne(
    { financialYear: '2024-25', ledgerName: 'Profit & Loss Account' },
    { $set: { 
      amount: Math.abs(closingPL),
      drCr: plDrCr,
      notes: `Opening loss ₹${Math.abs(openingLoss)} + Current year P&L ₹${netPL} = ₹${closingPL}`
    }}
  );
  console.log('Updated P&L Account:', r2.modifiedCount);

  // Verify BS balance
  const updated = await col.find({ financialYear: '2024-25' }).toArray();
  let assets = 0, liabNet = 0, income = 0, expenses2 = 0;
  for (const e of updated) {
    const amt = Math.abs(e.amount || 0);
    const cat = (e.category || '').toLowerCase();
    const dr = (e.drCr || '').toLowerCase();
    
    if (cat === 'asset') {
      assets += amt;
    } else if (cat === 'liability') {
      if (dr.startsWith('d')) liabNet -= amt; else liabNet += amt;
    } else if (cat === 'income' || cat === 'revenue') {
      income += amt;
    } else if (cat === 'expense') {
      expenses2 += amt;
    }
  }
  
  const netProfit = income - expenses2;
  console.log('\n=== UPDATED BS ===');
  console.log('Assets:', assets);
  console.log('Liabilities (net):', liabNet);
  console.log('Income:', income);
  console.log('Expenses:', expenses2);
  console.log('Net P&L:', netProfit);
  console.log('Assets:', assets);
  console.log('Liab + P&L:', liabNet + netProfit);
  console.log('Gap:', assets - liabNet - netProfit);

  await mongoose.disconnect();
}
fix();
