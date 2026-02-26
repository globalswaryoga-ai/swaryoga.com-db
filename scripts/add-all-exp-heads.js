/**
 * Add all remaining expense ledger heads under correct Tally groups
 * Tally groups: Indirect Expenses, Direct Expenses
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const b = mongoose.connection.collection('tally_manual_balances');

  // These heads exist in vouchers but NOT as ledger accounts
  // Map them to Tally groups
  const newLedgers = [
    // MOBILE-ONE PLUS → Fixed Assets (it's phone purchase, not expense)
    // Already exists as "Office Equipment (OnePlus)" in Fixed Assets - SKIP

    // DIVIDEND → already exists as "Dividends Paid" in Reserves & Surplus - SKIP

    // OFFICE EXP → same as "Office Expenses" which already exists - SKIP

    // CLASS EXP → same as "Class Expenses" which already exists - SKIP

    // FACEBOOK ADV → same as "Advertisement Expenses" which already exists - SKIP

    // SWAR YOGA L1 → This is Laptop EMI paid via L&T Finance for Upamanyu
    // Already exists as "Laptop EMI (L&T Finance)" - SKIP

    // TRAVELLING EXP → same as "Travelling Expenses" which already exists - SKIP

    // MOBILE RECHARGE → same as "Internet & Mobile Expenses" which already exists - SKIP

    // UPAMNYU KALBURGI → Upamanyu Kalburgi already added as Capital Account - SKIP

    // LIGHT BILL → same as "Electricity Expenses" which already exists - SKIP

    // Now add TRULY MISSING expense heads that should be separate ledgers:
    
    // Zoom subscription
    { ledgerName: 'Zoom Subscription', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Canva subscription
    { ledgerName: 'Canva Subscription', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Google Ads
    { ledgerName: 'Google Ads', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Facebook/Meta Ads (separate from existing "Advertisement Expenses"?)
    { ledgerName: 'Facebook Ads', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Diesel/Petrol
    { ledgerName: 'Fuel Expenses', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Car Repair
    { ledgerName: 'Vehicle Maintenance', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },

    // Jio Recharge
    { ledgerName: 'Mobile Recharge', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // IRCTC/RedBus - Travel
    { ledgerName: 'Travel Booking', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Zomato/Food
    { ledgerName: 'Food & Beverages', parentGroup: 'Direct Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Medical
    { ledgerName: 'Medical Expenses', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Printing/Xerox
    { ledgerName: 'Printing & Stationery', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // GoDaddy - Domain
    { ledgerName: 'Domain & Hosting', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Amazon purchases
    { ledgerName: 'Amazon Purchases', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Debit Card Fee
    { ledgerName: 'Debit Card Fee', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },

    // ROC/Central Board
    { ledgerName: 'Government Fees', parentGroup: 'Indirect Expenses', category: 'expense', amount: 0, drCr: 'Dr' },

    // Workshop/Event expenses (kailas Rah, Lagad Abhay etc.)
    { ledgerName: 'Workshop Expenses', parentGroup: 'Direct Expenses', category: 'expense', amount: 0, drCr: 'Dr' },
    
    // Dividend payments (already exists but let's check)
    // Dividends Paid → already in Reserves & Surplus
  ];

  let added = 0;
  for (const l of newLedgers) {
    const exists = await b.findOne({ financialYear: '2024-25', ledgerName: l.ledgerName });
    if (exists) {
      console.log('⚠️  Already exists: ' + l.ledgerName);
    } else {
      await b.insertOne({
        ...l,
        financialYear: '2024-25',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Added: ' + l.ledgerName + ' → ' + l.parentGroup);
      added++;
    }
  }

  console.log('\n── TOTAL ADDED: ' + added + ' ──');
  
  // Now also update existing ledgers to use Tally group names
  // Admin Expenses → Indirect Expenses
  // Employee Expenses → Indirect Expenses (or Direct Expenses)
  // Depreciation stays as Depreciation (it's a standard Tally group)
  
  console.log('\n── UPDATING EXISTING GROUP NAMES TO TALLY FORMAT ──');
  
  const updates = [
    { from: 'Admin Expenses', to: 'Indirect Expenses' },
    { from: 'Employee Expenses', to: 'Indirect Expenses' },
    { from: 'Revenue from Operations', to: 'Direct Incomes' },
    { from: 'Other Income', to: 'Direct Incomes' },
  ];
  
  for (const u of updates) {
    const result = await b.updateMany(
      { financialYear: '2024-25', parentGroup: u.from },
      { $set: { parentGroup: u.to, updatedAt: new Date() } }
    );
    if (result.modifiedCount > 0) {
      console.log('  ✅ ' + u.from + ' → ' + u.to + ' (' + result.modifiedCount + ' entries)');
    }
  }

  // Final list
  console.log('\n── ALL EXPENSE & INCOME LEDGERS (UPDATED) ──');
  const all = await b.find({ financialYear: '2024-25', category: { $in: ['expense', 'income'] } }).sort({ category: 1, parentGroup: 1, ledgerName: 1 }).toArray();
  for (const e of all) {
    console.log('  [' + e.category + '] ' + (e.parentGroup || '').padEnd(22) + '| ' + e.ledgerName + (e.amount ? ' = Rs.' + e.amount : ''));
  }
  console.log('Total expense+income ledgers:', all.length);

  await mongoose.disconnect();
}
run();
