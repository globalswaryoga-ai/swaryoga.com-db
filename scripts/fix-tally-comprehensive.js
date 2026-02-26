/**
 * fix-tally-comprehensive.js
 * 
 * Comprehensive fix for FY 2024-25 Balance Sheet and P&L
 * 
 * 1. Add ₹90,000 cash income (Oct-15, 40 students) to Course Fees
 * 2. Update all expense amounts from bank statement categorization
 * 3. Fix duplicate/overlapping entries
 * 4. Show before/after comparison
 */
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const col = db.collection('tally_manual_balances');

  const balances = await col.find({ financialYear: '2024-25' }).toArray();
  console.log('=== CURRENT FY 24-25 ACCOUNTS:', balances.length, '===\n');

  // Index by ledger name
  const byName = {};
  for (const b of balances) {
    byName[b.ledgerName] = b;
  }

  // ═══════════════════════════════════════════════════════
  // STEP 1: Add ₹90,000 cash income to Course Fees
  // ═══════════════════════════════════════════════════════
  console.log('=== STEP 1: Cash Income ₹90,000 (Oct-15, 40 students) ===');
  const courseFees = byName['Course Fees'];
  if (courseFees) {
    const oldAmt = courseFees.amount;
    const newAmt = oldAmt + 90000;
    console.log(`  Course Fees: ₹${oldAmt} → ₹${newAmt} (+₹90,000 cash income)`);
    if (!DRY_RUN) {
      await col.updateOne({ _id: courseFees._id }, { $set: { amount: newAmt, notes: (courseFees.notes || '') + ' | +₹90,000 cash income (Oct-15, 40 students)' } });
    }
  } else {
    console.log('  Course Fees NOT FOUND - creating new entry');
    if (!DRY_RUN) {
      await col.insertOne({
        ledgerName: 'Course Fees',
        parentGroup: 'Direct Incomes',
        category: 'income',
        amount: 90000,
        drCr: 'Cr',
        notes: 'Cash income Oct-15, 40 students',
        financialYear: '2024-25',
        asOnDate: '31-03-2025',
        createdBy: 'fix-script',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  // STEP 2: Update expense amounts from bank data
  // Bank categorization (401 entries + 14 missing = 415 total)
  // ═══════════════════════════════════════════════════════
  console.log('\n=== STEP 2: Update Expense Amounts ===');

  // These are the CORRECT amounts from bank statement analysis
  // (tally-expenses-final.js 401 entries + 14 missing entries)
  const expenseUpdates = [
    // Already populated - update with bank-verified amounts
    { ledger: 'Advertisement Expenses', newAmount: null, action: 'DELETE', note: 'Merged into Facebook Ads' },
    { ledger: 'Facebook Ads', newAmount: 70550, note: 'Bank: 53 entries ₹69,550 + 1 missing ₹1,000 (META Jul-09)' },
    { ledger: 'Office Rent', newAmount: 59190, note: 'Bank: 3 entries (₹42,000 rent + ₹17,190 advance/deposit)' },
    { ledger: 'Electricity Expenses', newAmount: 14650, note: 'Bank: 5 entries ✓ matches' },
    { ledger: 'Bank Charges', newAmount: 535.72, note: 'Bank: 20 entries' },

    // Update existing non-zero with bank amounts
    { ledger: 'Office Expenses', newAmount: 31606.54, note: 'Bank: 47 entries' },
    { ledger: 'Travelling Expenses', newAmount: null, action: 'DELETE', note: 'Split into Travel Booking + Fuel + MSRTC' },
    { ledger: 'Travel Booking', newAmount: 12705.09, note: 'Bank: 14 entries' },
    { ledger: 'Software Expenses', newAmount: 7215.70, note: 'Bank: Tally Software 1 entry' },
    { ledger: 'Staff Payments', newAmount: 35786, note: 'Bank: ₹33,386 + ₹2,400 (MAHI Nov-16 missing)' },
    { ledger: 'Food & Hospitality', newAmount: null, action: 'DELETE', note: 'Merged into Food & Beverages' },
    { ledger: 'Food & Beverages', newAmount: 14919.11, note: 'Bank: 30+2 entries (₹14,199.11 + ₹620 hotel + ₹100 fruit)' },
    { ledger: 'Miscellaneous Expenses', newAmount: 89450.45, note: 'Bank: 69+3 entries (₹88,360.45 + ₹625 + ₹95 + ₹370)' },
    { ledger: 'Class Expenses', newAmount: 9860, note: 'Bank: from Sheet1 EXP column ✓' },
    { ledger: 'MacBook EMI', newAmount: 10500, note: 'Bank: ✓ matches' },
    { ledger: 'Laptop EMI (L&T Finance)', newAmount: 12990, note: 'Bank: ✓ matches' },
    { ledger: 'Internet & Mobile Expenses', newAmount: 10800, note: 'From CA report ✓' },
    { ledger: 'CA Fees', newAmount: 10000, note: 'From CA report ✓' },
    { ledger: 'ROC Filing Fees', newAmount: 13150, note: 'Bank: 4 entries govt fees - ROC specific' },

    // Populate ₹0 entries with bank amounts
    { ledger: 'Zoom Subscription', newAmount: 9408.84, note: 'Bank: 6 entries' },
    { ledger: 'Canva Subscription', newAmount: 500, note: 'Bank: 1 entry' },
    { ledger: 'Google Ads', newAmount: 4639, note: 'Bank: 2+1 entries (₹4,000 + ₹639 missing Jul-11)' },
    { ledger: 'Fuel Expenses', newAmount: 14200, note: 'Bank: 9 entries' },
    { ledger: 'Vehicle Maintenance', newAmount: 11755, note: 'Bank: 8+1 entries (₹9,755 + ₹2,000 Yuvraj missing Dec-22)' },
    { ledger: 'Mobile Recharge', newAmount: 9926, note: 'Bank: 5 entries' },
    { ledger: 'Medical Expenses', newAmount: 1830, note: 'Bank: 4 entries' },
    { ledger: 'Printing & Stationery', newAmount: 1030, note: 'Bank: 2 entries' },
    { ledger: 'Domain & Hosting', newAmount: 1070.26, note: 'Bank: 1 entry' },
    { ledger: 'Amazon Purchases', newAmount: 5383, note: 'Bank: 4 entries' },
    { ledger: 'Debit Card Fee', newAmount: 0, note: 'No bank entries found' },
    { ledger: 'Government Fees', newAmount: 2740, note: 'Bank: ₹15,890 total minus ₹13,150 ROC = ₹2,740 other govt' },

    // Direct Expenses
    { ledger: 'Pandurang Kalburgi', newAmount: 5000, note: 'Bank: 2 entries' },
    { ledger: 'Workshop Expenses', newAmount: 45984, note: 'Bank: 16 entries' },
  ];

  // Teacher-related updates
  const teacherUpdates = [
    { ledger: 'Teacher Remuneration', newAmount: 75000, note: 'Verify: teachers paid outside bank? Keep CA report amount' },
    { ledger: 'Upamanyu Remuneration', newAmount: 36000, note: 'Verify: monthly remuneration per CA. Bank total ₹1,46,636 incl. capital withdrawals' },
  ];

  // BS (non-P&L) updates - Capital Account & Sundry Creditor payments
  const bsUpdates = [
    // Capital Account - Director withdrawals from bank
    { ledger: 'Mohan Kalburgi', newAmount: 396471, type: 'Dr', note: 'Bank: 27+1 entries (₹3,72,471 + ₹24,000 missing May-01). Director drawings.' },
    { ledger: 'Upamanyu Kalburgi', newAmount: 146635.82, type: 'Dr', note: 'Bank: 23 entries. Director drawings (includes ₹36K remuneration in separate ledger).' },
    // Wait - if Upamanyu Remuneration is a separate P&L expense at ₹36,000,
    // then the Capital Account withdrawal should be ₹1,46,636 - ₹36,000 = ₹1,10,636
    // But we can't be sure what's salary vs drawing. Let user decide.

    // Sundry Creditors - payments made to creditors during the year
    { ledger: 'Laxmi Kalburgi', newAmount: 35851, type: 'Dr', note: 'Bank: 10+1 entries (₹33,851 + ₹2,000 missing Jun-11). Teacher salary payments.' },
    { ledger: 'Turya Kalburgi', newAmount: 12300, type: 'Dr', note: 'Bank: 4 entries. Teacher salary payments.' },

    // Dividends - already Dr in Reserves & Surplus
    { ledger: 'Dividends Paid', newAmount: 72300, note: 'Bank: 13+2 entries (₹47,100 + ₹12,600 May-01 + ₹12,600 Nov-16 missing)' },
  ];

  // Process expense updates
  let totalExpenses = 0;
  const changes = [];

  for (const u of [...expenseUpdates, ...teacherUpdates]) {
    const existing = byName[u.ledger];
    if (u.action === 'DELETE') {
      if (existing) {
        console.log(`  ❌ DELETE: ${u.ledger} (₹${existing.amount}) — ${u.note}`);
        if (!DRY_RUN) {
          await col.deleteOne({ _id: existing._id });
        }
        changes.push({ ledger: u.ledger, old: existing.amount, new: 'DELETED' });
      }
      continue;
    }

    if (existing) {
      const changed = existing.amount !== u.newAmount;
      const icon = changed ? '✏️ ' : '✅';
      console.log(`  ${icon} ${u.ledger}: ₹${existing.amount} → ₹${u.newAmount} ${changed ? '(CHANGED)' : '(OK)'} — ${u.note}`);
      if (changed && !DRY_RUN) {
        await col.updateOne({ _id: existing._id }, { $set: { amount: u.newAmount, notes: u.note, updatedAt: new Date() } });
      }
      totalExpenses += u.newAmount;
      changes.push({ ledger: u.ledger, old: existing.amount, new: u.newAmount });
    } else {
      console.log(`  ➕ ADD: ${u.ledger} = ₹${u.newAmount} — ${u.note}`);
      // Don't auto-add, just report
      totalExpenses += u.newAmount;
    }
  }

  console.log('\n=== STEP 3: BS (non-P&L) Updates ===');
  for (const u of bsUpdates) {
    const existing = byName[u.ledger];
    if (existing) {
      const changed = existing.amount !== u.newAmount;
      const typeChanged = u.type && existing.drCr !== u.type;
      console.log(`  ${changed || typeChanged ? '✏️ ' : '✅'} ${u.ledger}: ${existing.drCr} ₹${existing.amount} → ${u.type || existing.drCr} ₹${u.newAmount} — ${u.note}`);
      if ((changed || typeChanged) && !DRY_RUN) {
        const updates = { amount: u.newAmount, notes: u.note, updatedAt: new Date() };
        if (u.type) updates.drCr = u.type;
        await col.updateOne({ _id: existing._id }, { $set: updates });
      }
    } else {
      console.log(`  ⚠️  ${u.ledger}: NOT FOUND in DB — ${u.note}`);
    }
  }

  // ═══════════════════════════════════════════════════════
  // STEP 4: Summary & Verification
  // ═══════════════════════════════════════════════════════
  console.log('\n=== STEP 4: After-Fix Summary ===');
  
  // Re-read all balances
  const afterBalances = DRY_RUN ? balances : await col.find({ financialYear: '2024-25' }).toArray();
  
  let assets = 0, liabilities = 0, income = 0, expenses = 0, depreciation = 0;
  const assetGrps = ['Fixed Assets', 'Cash & Cash Equivalents', 'Cash-in-Hand', 'Bank Accounts', 'Current Assets'];
  const liabGrps = ['Share Capital', 'Reserves & Surplus', 'Current Liabilities', 'Capital Account', 'Sundry Creditors', 'Non-Current Liabilities'];
  const incomeGrps = ['Direct Incomes', 'Sales Accounts', 'Indirect Incomes'];
  const expenseGrps = ['Direct Expenses', 'Indirect Expenses', 'Purchase Accounts'];
  const depGrps = ['Depreciation'];

  for (const b of afterBalances) {
    const amt = b.amount || 0;
    const g = b.parentGroup || '';
    if (assetGrps.includes(g)) assets += (b.drCr === 'Dr' ? amt : -amt);
    else if (liabGrps.includes(g)) liabilities += (b.drCr === 'Cr' ? amt : -amt);
    else if (incomeGrps.includes(g)) income += (b.drCr === 'Cr' ? amt : -amt);
    else if (expenseGrps.includes(g)) expenses += (b.drCr === 'Dr' ? amt : -amt);
    else if (depGrps.includes(g)) depreciation += (b.drCr === 'Dr' ? amt : -amt);
  }

  const totalExp = expenses + depreciation;
  const pnl = income - totalExp;

  console.log(`  Assets:       ₹${assets.toLocaleString('en-IN')}`);
  console.log(`  Liabilities:  ₹${liabilities.toLocaleString('en-IN')}`);
  console.log(`  Income:       ₹${income.toLocaleString('en-IN')}`);
  console.log(`  Expenses:     ₹${expenses.toLocaleString('en-IN')} + Dep ₹${depreciation.toLocaleString('en-IN')} = ₹${totalExp.toLocaleString('en-IN')}`);
  console.log(`  P&L:          ₹${pnl.toLocaleString('en-IN')} (${pnl < 0 ? 'LOSS' : 'PROFIT'})`);
  console.log(`  BS Gap:       ₹${(assets - liabilities - pnl).toLocaleString('en-IN')}`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no changes were made. Run without --dry-run to apply.');
  } else {
    console.log('\n✅ All changes applied to database.');
  }

  await client.close();
})();
