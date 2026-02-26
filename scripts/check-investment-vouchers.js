const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const vCol = mongoose.connection.collection('tally_manual_vouchers');
  const bCol = mongoose.connection.collection('tally_manual_balances');

  // Check all Receipt vouchers
  const receipts = await vCol.find({ fy: '2024-25', type: 'Receipt' }).toArray();
  console.log('=== ALL RECEIPT VOUCHERS ===');
  let totalReceipts = 0;
  for (const r of receipts) {
    const amt = r.amount || 0;
    totalReceipts += amt;
    const party = r.party || r.ledger || '';
    const narr = r.narration || '';
    const cat = r.category || '';
    // Flag investment/capital related
    const isInvestment = /invest|capital|loan|share/i.test(party + narr + cat);
    console.log(`  ${r.date} | ₹${amt.toLocaleString('en-IN')} | ${party} | ${cat} | ${narr.substring(0,50)} ${isInvestment ? '*** INVESTMENT ***' : ''}`);
  }
  console.log(`\nTotal Receipts: ₹${totalReceipts.toLocaleString('en-IN')}`);

  // Check categories
  console.log('\n=== RECEIPT CATEGORIES ===');
  const catMap = {};
  for (const r of receipts) {
    const cat = r.category || 'UNCATEGORIZED';
    if (!catMap[cat]) catMap[cat] = { count: 0, total: 0 };
    catMap[cat].count++;
    catMap[cat].total += r.amount || 0;
  }
  for (const [cat, data] of Object.entries(catMap)) {
    console.log(`  ${cat}: ${data.count} vouchers, ₹${data.total.toLocaleString('en-IN')}`);
  }

  // Check Contra vouchers (bank transfers, cash deposits)
  const contras = await vCol.find({ fy: '2024-25', type: 'Contra' }).toArray();
  console.log('\n=== CONTRA VOUCHERS ===');
  let totalContra = 0;
  for (const c of contras) {
    totalContra += c.amount || 0;
    console.log(`  ${c.date} | ₹${(c.amount||0).toLocaleString('en-IN')} | ${c.party||''} | ${c.narration||''}`);
  }
  console.log(`Total Contra: ₹${totalContra.toLocaleString('en-IN')}`);

  // Check balance entries
  console.log('\n=== BALANCE ENTRIES ===');
  const balances = await bCol.find({ fy: '2024-25' }).toArray();
  let assets = 0, liab = 0, income = 0, expenses = 0;
  for (const b of balances) {
    const amt = Math.abs(b.closing_balance || 0);
    const cat = (b.category || '').toUpperCase();
    if (['FIXED ASSETS','CURRENT ASSETS','INVESTMENTS'].includes(cat)) {
      assets += amt;
      console.log(`  ASSET: ${b.particular} = ₹${amt.toLocaleString('en-IN')} (${b.balance_type})`);
    } else if (['CAPITAL','RESERVES','CURRENT LIABILITIES','LOANS'].includes(cat)) {
      // Dr reduces liability, Cr increases
      if (b.balance_type === 'Dr') liab -= amt; else liab += amt;
      console.log(`  LIAB: ${b.particular} = ₹${amt.toLocaleString('en-IN')} (${b.balance_type}) → net ${b.balance_type === 'Dr' ? '-' : '+'}${amt.toLocaleString('en-IN')}`);
    } else if (['INCOME','REVENUE'].includes(cat)) {
      income += amt;
      console.log(`  INCOME: ${b.particular} = ₹${amt.toLocaleString('en-IN')}`);
    } else if (['EXPENSES','EXPENSE'].includes(cat)) {
      expenses += amt;
      console.log(`  EXPENSE: ${b.particular} = ₹${amt.toLocaleString('en-IN')}`);
    }
  }

  const netProfit = income - expenses;
  console.log('\n=== BALANCE SHEET SUMMARY ===');
  console.log(`Assets: ₹${assets.toLocaleString('en-IN')}`);
  console.log(`Liabilities (net): ₹${liab.toLocaleString('en-IN')}`);
  console.log(`Income: ₹${income.toLocaleString('en-IN')}`);
  console.log(`Expenses: ₹${expenses.toLocaleString('en-IN')}`);
  console.log(`Net Profit: ₹${netProfit.toLocaleString('en-IN')}`);
  console.log(`Assets = ₹${assets.toLocaleString('en-IN')}`);
  console.log(`Liab + Profit = ₹${(liab + netProfit).toLocaleString('en-IN')}`);
  console.log(`GAP: ₹${(assets - liab - netProfit).toLocaleString('en-IN')}`);

  await mongoose.disconnect();
}
check();
