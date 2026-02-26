const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const col = db.collection('tally_manual_balances');
  
  // 1. Rename Vishal Agarwal to Laxmi Kalburgi
  const result = await col.updateOne(
    { financialYear: '2024-25', ledgerName: 'Vishal Agarwal (Raipur)' },
    { $set: { ledgerName: 'Laxmi Kalburgi', notes: 'Sundry Creditor - Laxmi Kalburgi', updatedAt: new Date() } }
  );
  console.log('Renamed: Vishal Agarwal → Laxmi Kalburgi | Modified:', result.modifiedCount);

  // 2. Check duplicates
  const laxmis = await col.find({ financialYear: '2024-25', ledgerName: 'Laxmi Kalburgi' }).toArray();
  console.log('Laxmi Kalburgi entries:', laxmis.length);
  for (const l of laxmis) {
    console.log('  ', l.parentGroup, '|', l.drCr, '| Rs.' + l.amount);
  }

  // 3. Show current P&L analysis
  const all = await col.find({ financialYear: '2024-25' }).toArray();
  
  const incomeGrps = ['Direct Incomes', 'Sales Accounts', 'Indirect Incomes'];
  const expenseGrps = ['Direct Expenses', 'Indirect Expenses', 'Purchase Accounts'];
  const depGrps = ['Depreciation'];
  
  let totalIncome = 0, totalExpenses = 0, totalDep = 0;
  
  console.log('\n=== P&L BREAKDOWN ===');
  console.log('\n--- INCOME ---');
  for (const b of all.filter(b => incomeGrps.includes(b.parentGroup))) {
    const amt = b.drCr === 'Cr' ? b.amount : -b.amount;
    totalIncome += amt;
    console.log('  ' + b.ledgerName + ': Rs.' + b.amount + ' (' + b.drCr + ')');
  }
  console.log('  TOTAL INCOME: Rs.' + totalIncome);
  
  console.log('\n--- EXPENSES ---');
  for (const b of all.filter(b => expenseGrps.includes(b.parentGroup)).sort((a,b) => b.amount - a.amount)) {
    const amt = b.drCr === 'Dr' ? b.amount : -b.amount;
    totalExpenses += amt;
    console.log('  ' + b.ledgerName.padEnd(35) + ' Rs.' + String(b.amount).padStart(10));
  }
  console.log('  TOTAL EXPENSES: Rs.' + totalExpenses);
  
  console.log('\n--- DEPRECIATION ---');
  for (const b of all.filter(b => depGrps.includes(b.parentGroup))) {
    const amt = b.drCr === 'Dr' ? b.amount : -b.amount;
    totalDep += amt;
    console.log('  ' + b.ledgerName + ': Rs.' + b.amount);
  }
  console.log('  TOTAL DEPRECIATION: Rs.' + totalDep);
  
  const totalExp = totalExpenses + totalDep;
  const pnl = totalIncome - totalExp;
  console.log('\n=== P&L SUMMARY ===');
  console.log('Income:       Rs.' + totalIncome.toFixed(2));
  console.log('Expenses:     Rs.' + totalExpenses.toFixed(2));
  console.log('Depreciation: Rs.' + totalDep.toFixed(2));
  console.log('Total Exp:    Rs.' + totalExp.toFixed(2));
  console.log('NET ' + (pnl < 0 ? 'LOSS' : 'PROFIT') + ':    Rs.' + Math.abs(pnl).toFixed(2));
  
  console.log('\n=== WAYS TO REDUCE LOSS ===');
  console.log('Current loss: Rs.' + Math.abs(pnl).toFixed(2));
  console.log('');
  
  // Check items that could reduce loss
  const suggestions = [];
  
  // 1. Mohan/Upamanyu - if these are director drawings, they are BS item not P&L expense
  const mohan = all.find(b => b.ledgerName === 'Mohan Kalburgi' && b.parentGroup === 'Capital Account');
  const upam = all.find(b => b.ledgerName === 'Upamanyu Kalburgi' && b.parentGroup === 'Capital Account');
  
  // 2. Check expense items that might be BS items
  for (const b of all.filter(b => expenseGrps.includes(b.parentGroup) && b.amount > 0)) {
    if (b.ledgerName.includes('Dividend') || b.ledgerName.includes('Fund Transfer') || b.ledgerName.includes('Investment')) {
      suggestions.push('  - ' + b.ledgerName + ' Rs.' + b.amount + ' → Should this be in BS instead of P&L?');
    }
  }
  
  // 3. Depreciation is very high
  suggestions.push('  - Depreciation Rs.' + totalDep + ' is ' + ((totalDep/totalIncome)*100).toFixed(1) + '% of income');
  
  // 4. Cash income not added yet?
  const courseFees = all.find(b => b.ledgerName === 'Course Fees');
  suggestions.push('  - Course Fees: Rs.' + (courseFees ? courseFees.amount : 0) + ' (does this include ₹90,000 cash income?)');
  
  // 5. Fees Receivable 
  const feesRec = all.find(b => b.ledgerName === 'Fees Receivable');
  if (feesRec) suggestions.push('  - Fees Receivable Rs.' + feesRec.amount + ' → Any collected this year = add to income');
  
  for (const s of suggestions) console.log(s);
  
  await client.close();
})();
