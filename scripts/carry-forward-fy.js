/**
 * Carry Forward FY 2023-24 closing balances → FY 2024-25 opening balances
 *
 * Accounting rules:
 *   - Balance Sheet items (assets, liabilities): closing balance carries forward as opening
 *   - P&L items (income, expenses): reset to ZERO for new year
 *   - Net profit/loss from P&L → already in "Profit & Loss Account" on Balance Sheet
 *
 * Source: CA report audited balances (createdBy: 'ca-report-import') for FY 2023-24
 * Target: New opening balance entries for FY 2024-25
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) { console.error('❌ MONGODB_URI_MAIN not set'); process.exit(1); }

  await mongoose.connect(uri, { dbName: 'swaryoga_admin_crm' });
  console.log('✅ Connected to MongoDB (swaryoga_admin_crm)');

  const db = mongoose.connection.db;

  // ─── 1. Get all FY 2023-24 balances ───────────────────────────────
  const all2324 = await db.collection('tally_manual_balances').find({ financialYear: '2023-24' }).toArray();
  console.log(`\n📊 FY 2023-24 total balance entries: ${all2324.length}`);

  // CA report entries = final audited figures (these are the CORRECT closing balances)
  const caEntries = all2324.filter(e => e.createdBy === 'ca-report-import');
  const excelEntries = all2324.filter(e => e.createdBy === 'excel-import');
  console.log(`   CA report entries: ${caEntries.length}`);
  console.log(`   Excel entries: ${excelEntries.length}`);

  // ─── 2. Check FY 2024-25 existing data ────────────────────────────
  const existing2425 = await db.collection('tally_manual_balances').countDocuments({ financialYear: '2024-25' });
  const existingVch2425 = await db.collection('tally_manual_vouchers').countDocuments({ financialYear: '2024-25' });
  console.log(`\n📊 FY 2024-25 existing: ${existing2425} balances, ${existingVch2425} vouchers`);

  // ─── 3. Build opening balances for FY 2024-25 ─────────────────────
  // Use CA report entries as the authoritative closing balances for 2023-24
  // ALL ledgers get an opening balance entry:
  //   - Balance Sheet items (assets + liabilities): carry closing balance
  //   - P&L items (income + expenses): zero opening balance (ledger exists but resets)

  const openingBalances = [];

  console.log('\n── Carrying Forward ALL Ledgers ──');
  console.log('\n  Balance Sheet Items (with balance):');
  for (const entry of caEntries) {
    const cat = entry.category;
    const isBS = (cat === 'asset' || cat === 'liability');

    if (isBS) {
      console.log(`  ✅ ${entry.ledgerName.padEnd(40)} ${entry.drCr}  ₹${entry.amount.toLocaleString('en-IN').padStart(12)}  [${cat}]`);
    }

    openingBalances.push({
      ledgerName: entry.ledgerName,
      parentGroup: entry.parentGroup,
      category: entry.category,
      amount: isBS ? entry.amount : 0,
      drCr: entry.drCr,
      financialYear: '2024-25',
      asOnDate: '01-04-2024',
      notes: isBS
        ? `Opening balance carried forward from FY 2023-24 (CA audited closing)`
        : `Ledger carried from FY 2023-24 (P&L reset to zero)`,
      createdBy: 'carry-forward',
    });
  }

  const bsItems = openingBalances.filter(b => b.category === 'asset' || b.category === 'liability');
  const plItems = openingBalances.filter(b => b.category === 'income' || b.category === 'expense');
  
  console.log('\n  P&L Items (zero opening balance):');
  for (const entry of plItems) {
    console.log(`  📋 ${entry.ledgerName.padEnd(40)} ${entry.drCr}  ₹0            [${entry.category}]`);
  }

  console.log(`\n📝 Total ledgers to carry forward: ${openingBalances.length}`);
  console.log(`   Balance Sheet items (with balance): ${bsItems.length}`);
  console.log(`   P&L items (zero balance): ${plItems.length}`);

  // Verify balance: Total Assets = Total Liabilities
  let totalAssetsDr = 0, totalLiabCr = 0;
  for (const b of openingBalances) {
    if (b.drCr === 'Dr') totalAssetsDr += b.amount;
    else totalLiabCr += b.amount;
  }
  console.log(`\n   Total Dr (Assets): ₹${totalAssetsDr.toLocaleString('en-IN')}`);
  console.log(`   Total Cr (Liabilities): ₹${totalLiabCr.toLocaleString('en-IN')}`);
  const diff = Math.abs(totalAssetsDr - totalLiabCr);
  if (diff < 1) {
    console.log(`   ✅ BALANCED!`);
  } else {
    console.log(`   ⚠️  Difference: ₹${diff.toLocaleString('en-IN')}`);
  }

  // ─── 4. Delete old carry-forward entries for 2024-25 ──────────────
  const oldCarry = await db.collection('tally_manual_balances').countDocuments({
    financialYear: '2024-25',
    createdBy: 'carry-forward',
  });
  if (oldCarry > 0) {
    console.log(`\n⚠️  Deleting ${oldCarry} old carry-forward entries for FY 2024-25`);
    await db.collection('tally_manual_balances').deleteMany({
      financialYear: '2024-25',
      createdBy: 'carry-forward',
    });
  }

  // ─── 5. Insert new opening balances ────────────────────────────────
  if (openingBalances.length > 0) {
    const result = await db.collection('tally_manual_balances').insertMany(openingBalances);
    console.log(`\n✅ Inserted ${result.insertedCount} opening balance entries for FY 2024-25`);
  }

  // ─── 6. Verify ────────────────────────────────────────────────────
  const final2425 = await db.collection('tally_manual_balances').countDocuments({ financialYear: '2024-25' });
  const finalVch2425 = await db.collection('tally_manual_vouchers').countDocuments({ financialYear: '2024-25' });

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  CARRY FORWARD COMPLETE                                      ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  FY 2023-24 CA balances:     ${String(caEntries.length).padEnd(33)}║`);
  console.log(`║  Total ledgers carried:      ${String(openingBalances.length).padEnd(33)}║`);
  console.log(`║  BS items (with balance):    ${String(bsItems.length).padEnd(33)}║`);
  console.log(`║  P&L items (zero balance):   ${String(plItems.length).padEnd(33)}║`);
  console.log(`║  FY 2024-25 total balances:  ${String(final2425).padEnd(33)}║`);
  console.log(`║  FY 2024-25 vouchers:        ${String(finalVch2425).padEnd(33)}║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  await mongoose.disconnect();
  console.log('🔒 Done.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
