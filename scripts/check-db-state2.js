const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');

  const balances = await db.collection('tally_manual_balances').find({ fy: '2024-25' }).toArray();

  console.log('=== ALL FY 24-25 ACCOUNTS ===');
  console.log('Total accounts:', balances.length);
  console.log('');

  const groups = {};
  for (const b of balances) {
    const g = b.group || 'UNKNOWN';
    if (!groups[g]) groups[g] = [];
    groups[g].push(b);
  }

  let totalAssets = 0, totalLiabilities = 0;
  let totalIncome = 0, totalExpenses = 0;

  const assetGroups = ['Fixed Assets', 'Cash-in-Hand', 'Bank Accounts', 'Current Assets', 'Investments', 'Loans & Advances (Asset)'];
  const liabGroups = ['Share Capital', 'Reserves & Surplus', 'Current Liabilities', 'Capital Account', 'Sundry Creditors', 'Non-Current Liabilities', 'Secured Loans', 'Unsecured Loans', 'Loans (Liability)'];
  const incomeGroups = ['Direct Incomes', 'Sales Accounts', 'Indirect Incomes'];
  const expenseGroups = ['Direct Expenses', 'Indirect Expenses', 'Purchase Accounts'];

  for (const [g, items] of Object.entries(groups).sort()) {
    console.log('--- ' + g + ' ---');
    for (const b of items) {
      const amt = b.amount || 0;
      const type = b.type || '?';
      console.log('  ' + b.ledger + ' | ' + type + ' | Rs.' + amt);

      if (assetGroups.includes(g)) {
        totalAssets += (type === 'Dr' ? amt : -amt);
      } else if (liabGroups.includes(g)) {
        totalLiabilities += (type === 'Cr' ? amt : -amt);
      } else if (incomeGroups.includes(g)) {
        totalIncome += (type === 'Cr' ? amt : -amt);
      } else if (expenseGroups.includes(g)) {
        totalExpenses += (type === 'Dr' ? amt : -amt);
      }
    }
    console.log('');
  }

  console.log('=== SUMMARY ===');
  console.log('Total Assets:', totalAssets.toFixed(2));
  console.log('Total Liabilities:', totalLiabilities.toFixed(2));
  console.log('Total Income:', totalIncome.toFixed(2));
  console.log('Total Expenses:', totalExpenses.toFixed(2));
  console.log('P&L (Income - Expenses):', (totalIncome - totalExpenses).toFixed(2));
  console.log('BS Check: Assets - (Liabilities + P&L) =', (totalAssets - totalLiabilities - (totalIncome - totalExpenses)).toFixed(2));

  // Search for cash/class related
  console.log('\n=== Cash/Class/90000 related ===');
  for (const b of balances) {
    if (b.ledger && (b.ledger.toLowerCase().includes('cash') || b.ledger.toLowerCase().includes('class') || b.amount === 90000)) {
      console.log(b.ledger, '|', b.type, '|', b.group, '| Rs.' + b.amount);
    }
  }

  await client.close();
})();
