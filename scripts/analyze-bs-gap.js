/**
 * Analyze BS gap after investment fix
 * Check opening BS from FY 2023-24 and closing BS for FY 2024-25
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function analyze() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const col = mongoose.connection.collection('tally_manual_balances');

  // FY 2023-24 closing (= FY 2024-25 opening)
  const fy2324 = await col.find({ financialYear: '2023-24' }).toArray();
  console.log('=== FY 2023-24 CLOSING (= Opening for 2024-25) ===');
  let openAssets = 0, openLiab = 0;
  for (const e of fy2324) {
    const amt = Math.abs(e.amount || 0);
    const cat = (e.category || '').toLowerCase();
    const dr = (e.drCr || '').toLowerCase();
    if (cat === 'asset') {
      openAssets += amt;
      console.log('  A: ' + e.ledgerName + ' = ' + amt);
    } else if (cat === 'liability') {
      const sign = dr.startsWith('d') ? -1 : 1;
      openLiab += sign * amt;
      console.log('  L: ' + e.ledgerName + ' = ' + (sign > 0 ? '+' : '-') + amt + ' (' + dr + ')');
    }
  }
  console.log('Opening Assets: ' + openAssets);
  console.log('Opening Liabilities: ' + openLiab);
  console.log('Opening Gap: ' + (openAssets - openLiab));

  // FY 2024-25 closing
  const fy2425 = await col.find({ financialYear: '2024-25' }).toArray();
  console.log('\n=== FY 2024-25 CLOSING ===');
  let closeAssets = 0, closeLiab = 0, income = 0, expenses = 0;
  for (const e of fy2425) {
    const amt = Math.abs(e.amount || 0);
    const cat = (e.category || '').toLowerCase();
    const dr = (e.drCr || '').toLowerCase();
    if (cat === 'asset') {
      closeAssets += amt;
      console.log('  A: ' + e.ledgerName + ' = ' + amt);
    } else if (cat === 'liability') {
      const sign = dr.startsWith('d') ? -1 : 1;
      closeLiab += sign * amt;
      console.log('  L: ' + e.ledgerName + ' = ' + (sign > 0 ? '+' : '-') + amt + ' (' + dr + ')');
    } else if (cat === 'income' || cat === 'revenue') {
      income += amt;
    } else if (cat === 'expense') {
      expenses += amt;
    }
  }
  console.log('Closing Assets: ' + closeAssets);
  console.log('Closing Liabilities: ' + closeLiab);
  console.log('BS Gap (A - L): ' + (closeAssets - closeLiab));
  console.log('Income: ' + income + ', Expenses: ' + expenses);
  console.log('Net P&L: ' + (income - expenses));

  // The buildBSFromManual in the UI only shows asset/liability entries
  // P&L Account entry already has closing balance (including current year loss)
  // So the UI shows: Assets vs Liabilities (with P&L Account included)
  // For BS to balance, Assets MUST = Liabilities (net)
  
  console.log('\n=== GAP ANALYSIS ===');
  console.log('UI will show: Assets=' + closeAssets + ' vs Liabilities=' + closeLiab);
  console.log('Difference: ' + (closeAssets - closeLiab));
  
  // What changed from opening to closing?
  console.log('\n=== MOVEMENT ANALYSIS ===');
  console.log('Asset change: ' + closeAssets + ' - ' + openAssets + ' = ' + (closeAssets - openAssets));
  console.log('Liability change: ' + closeLiab + ' - ' + openLiab + ' = ' + (closeLiab - openLiab));

  await mongoose.disconnect();
}
analyze();
