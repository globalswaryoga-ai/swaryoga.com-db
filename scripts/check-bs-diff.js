require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  
  // First find which DB has tally data
  const mainColls = await mongoose.connection.db.listCollections().toArray();
  const tallyMain = mainColls.filter(c => c.name.toLowerCase().includes('tally') || c.name.toLowerCase().includes('manual'));
  console.log('Main DB tally collections:', tallyMain.map(c => c.name));
  
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
  const crmColls = await crmDb.db.listCollections().toArray();
  const tallyCrm = crmColls.filter(c => c.name.toLowerCase().includes('tally') || c.name.toLowerCase().includes('manual'));
  console.log('CRM DB tally collections:', tallyCrm.map(c => c.name));

  // Count docs in each
  for (const name of tallyMain.map(c => c.name)) {
    const count = await mongoose.connection.db.collection(name).countDocuments();
    console.log('  Main.' + name + ':', count, 'docs');
  }
  for (const name of tallyCrm.map(c => c.name)) {
    const count = await crmDb.db.collection(name).countDocuments();
    console.log('  CRM.' + name + ':', count, 'docs');
  }

  // Use whichever DB has the data
  let balances;
  const crmCount = await crmDb.db.collection('tally_manual_balances').countDocuments().catch(() => 0);
  const mainCount = await mongoose.connection.db.collection('tally_manual_balances').countDocuments().catch(() => 0);
  console.log('\ntally_manual_balances - CRM:', crmCount, 'Main:', mainCount);
  
  if (mainCount > 0) {
    balances = mongoose.connection.db.collection('tally_manual_balances');
    console.log('Using MAIN DB');
  } else {
    balances = crmDb.db.collection('tally_manual_balances');
    console.log('Using CRM DB');
  }
  
  const fys = await balances.distinct('financialYear');
  console.log('Financial Years:', fys);
  
  for (const fy of fys) {
    const assets = await balances.find({ financialYear: fy, category: 'asset' }).toArray();
    const liabilities = await balances.find({ financialYear: fy, category: 'liability' }).toArray();
    const income = await balances.find({ financialYear: fy, category: 'income' }).toArray();
    const expenses = await balances.find({ financialYear: fy, category: 'expense' }).toArray();
    
    const totalAssets = assets.reduce((s, e) => s + (e.amount || 0), 0);
    const totalLiabilities = liabilities.reduce((s, e) => s + (e.amount || 0), 0);
    const totalIncome = income.reduce((s, e) => s + (e.amount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    
    console.log('\n========== FY: ' + fy + ' ==========');
    console.log('  Assets count:', assets.length, '  Total:', totalAssets);
    console.log('  Liabilities count:', liabilities.length, '  Total:', totalLiabilities);
    console.log('  Income count:', income.length, '  Total:', totalIncome);
    console.log('  Expenses count:', expenses.length, '  Total:', totalExpenses);
    console.log('  DIFFERENCE (Assets - Liabilities):', totalAssets - totalLiabilities);
    console.log('  Net Profit (Income - Expenses):', totalIncome - totalExpenses);
    
    if (Math.abs(totalAssets - totalLiabilities) > 1) {
      console.log('\n  --- ASSETS BREAKDOWN ---');
      const assetByGroup = {};
      assets.forEach(a => {
        const g = a.parentGroup || 'Other';
        if (!assetByGroup[g]) assetByGroup[g] = { total: 0, items: [] };
        assetByGroup[g].total += a.amount;
        assetByGroup[g].items.push({ name: a.ledgerName, amount: a.amount, drCr: a.drCr });
      });
      Object.entries(assetByGroup).sort((a,b) => b[1].total - a[1].total).forEach(([g, d]) => {
        console.log('    ' + g + ': ' + d.total);
        d.items.sort((a,b) => b.amount - a.amount).forEach(i => console.log('      - ' + i.name + ': ' + i.amount + ' (' + i.drCr + ')'));
      });
      
      console.log('\n  --- LIABILITIES BREAKDOWN ---');
      const liabByGroup = {};
      liabilities.forEach(a => {
        const g = a.parentGroup || 'Other';
        if (!liabByGroup[g]) liabByGroup[g] = { total: 0, items: [] };
        liabByGroup[g].total += a.amount;
        liabByGroup[g].items.push({ name: a.ledgerName, amount: a.amount, drCr: a.drCr });
      });
      Object.entries(liabByGroup).sort((a,b) => b[1].total - a[1].total).forEach(([g, d]) => {
        console.log('    ' + g + ': ' + d.total);
        d.items.sort((a,b) => b.amount - a.amount).forEach(i => console.log('      - ' + i.name + ': ' + i.amount + ' (' + i.drCr + ')'));
      });

      // Check for duplicate ledgerNames
      console.log('\n  --- CHECKING DUPLICATES ---');
      const allEntries = [...assets, ...liabilities];
      const nameCount = {};
      allEntries.forEach(e => {
        const key = e.ledgerName + '|' + e.category;
        nameCount[key] = (nameCount[key] || 0) + 1;
      });
      const dupes = Object.entries(nameCount).filter(([k,v]) => v > 1);
      if (dupes.length > 0) {
        console.log('  DUPLICATES FOUND:');
        dupes.forEach(([k,v]) => console.log('    ' + k + ' appears ' + v + ' times'));
      } else {
        console.log('  No duplicates found');
      }

      // Check if Profit & Loss (Reserves & Surplus) is missing
      console.log('\n  --- POSSIBLE MISSING: Profit & Loss balance ---');
      const hasReserves = liabilities.some(l => l.parentGroup === 'Reserves & Surplus');
      const hasPnL = liabilities.some(l => l.ledgerName.toLowerCase().includes('profit') || l.ledgerName.toLowerCase().includes('p&l'));
      console.log('  Has Reserves & Surplus group:', hasReserves);
      console.log('  Has P&L ledger:', hasPnL);
      console.log('  Net Profit (should be in Reserves/Capital):', totalIncome - totalExpenses);
      console.log('  If we add net profit to liabilities:', totalLiabilities + (totalIncome - totalExpenses));
      console.log('  New difference would be:', totalAssets - (totalLiabilities + (totalIncome - totalExpenses)));
    }
  }
  
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
