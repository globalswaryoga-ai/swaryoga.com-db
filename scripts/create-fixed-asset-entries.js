#!/usr/bin/env node
/**
 * Create Fixed Asset entries in FY 23-24 (detail breakdown) and
 * FY 24-25 (depreciation vouchers from depreciation chart)
 *
 * Depreciation Chart Data (Companies Act 2013):
 * ┌─────────────────────────┬──────────┬────────┬─────────┬──────────┬──────────┐
 * │ Asset                   │ Cost     │ Life   │ Rate %  │ Dep 24-25│ NetBlock │
 * ├─────────────────────────┼──────────┼────────┼─────────┼──────────┼──────────┤
 * │ Computer                │ 239,516  │ 3 yrs  │ 63.16   │ 151,278  │ 88,238   │
 * │ Furniture and Fixture   │  10,898  │ 10 yrs │ 25.89   │   2,821  │  8,077   │
 * │ Software                │  11,369  │ 3 yrs  │ 63.16   │   7,181  │  4,188   │
 * │ Machinery & Equipments  │  10,743  │ 10 yrs │ 25.89   │   2,781  │  7,962   │
 * │ JBL Speaker             │   1,653  │ 10 yrs │ 25.89   │   1,653  │      0   │ (fully dep)
 * │ Mobile                  │   7,202  │ 5 yrs  │ 45.07   │   7,201  │      1   │
 * ├─────────────────────────┼──────────┼────────┼─────────┼──────────┼──────────┤
 * │ TOTAL                   │ 281,381  │        │         │ 172,914  │ 108,467  │ +scrap
 * └─────────────────────────┴──────────┴────────┴─────────┴──────────┴──────────┘
 *
 * Scrap values: Computer 11,976 | F&F 545 | Software 568 | M&E 537 | JBL 83 | Mobile 360
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const ASSETS = [
  { name: 'Computer',                cost: 239516, usefulLife: 3,  depRate: 63.16, dep2425: 151278, netBlock2425: 88238,  scrap: 11976, purchaseDate: '2024-03-31' },
  { name: 'Furniture and Fixture',   cost: 10898,  usefulLife: 10, depRate: 25.89, dep2425: 2821,   netBlock2425: 8077,   scrap: 545,   purchaseDate: '2024-03-31' },
  { name: 'Software',                cost: 11369,  usefulLife: 3,  depRate: 63.16, dep2425: 7181,   netBlock2425: 4188,   scrap: 568,   purchaseDate: '2024-03-31' },
  { name: 'Machinery & Equipments',  cost: 10743,  usefulLife: 10, depRate: 25.89, dep2425: 2781,   netBlock2425: 7962,   scrap: 537,   purchaseDate: '2024-03-31' },
  { name: 'JBL Speaker',             cost: 1653,   usefulLife: 10, depRate: 25.89, dep2425: 1653,   netBlock2425: 0,      scrap: 83,    purchaseDate: '2024-03-31' },
  { name: 'Mobile',                  cost: 7202,   usefulLife: 5,  depRate: 45.07, dep2425: 7201,   netBlock2425: 1,      scrap: 360,   purchaseDate: '2024-03-31' },
];

const TOTAL_ASSET_COST = ASSETS.reduce((s, a) => s + a.cost, 0); // 281,381
const TOTAL_DEP_2425 = ASSETS.reduce((s, a) => s + a.dep2425, 0); // 172,914
const ORIGINAL_NET_BLOCK = 397719; // from CA report FY 23-24
const OTHER_FIXED_ASSETS = ORIGINAL_NET_BLOCK - TOTAL_ASSET_COST; // 116,338

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const now = new Date();

  console.log(`\n═══ FIXED ASSET ENTRIES SCRIPT ═══`);
  console.log(`Total Asset Cost: ${TOTAL_ASSET_COST} | Other Fixed Assets: ${OTHER_FIXED_ASSETS}`);
  console.log(`Total = ${TOTAL_ASSET_COST + OTHER_FIXED_ASSETS} (should = ${ORIGINAL_NET_BLOCK})\n`);

  // ═══════════════════════════════════════════════════
  // FY 23-24: Break "Fixed Assets (Net Block)" into individual ledgers
  // ═══════════════════════════════════════════════════
  console.log('─── FY 23-24: Updating Fixed Asset Ledgers ───');

  // 1. Delete "Fixed Assets (Net Block)"
  const delResult = await db.collection('acc_ledgers').deleteOne({
    financialYear: '2023-24',
    name: 'Fixed Assets (Net Block)',
  });
  console.log(`  Deleted "Fixed Assets (Net Block)": ${delResult.deletedCount}`);

  // 2. Create individual asset ledgers at COST (= Net Block at 31/03/2024, since purchased on last day)
  for (const asset of ASSETS) {
    // Use upsert to avoid duplicate key errors
    const existing = await db.collection('acc_ledgers').findOne({
      financialYear: '2023-24', name: asset.name,
    });
    if (existing) {
      console.log(`  ⏭ "${asset.name}" already exists in 23-24 (OB: ${existing.openingBalance}), skipping`);
      continue;
    }
    await db.collection('acc_ledgers').insertOne({
      name: asset.name,
      group: 'ASSET',
      subGroup: 'Fixed Assets',
      openingBalance: asset.cost,
      openingBalanceType: 'DEBIT',
      financialYear: '2023-24',
      isActive: true,
      description: `Fixed Asset — Cost: ₹${asset.cost.toLocaleString('en-IN')} | Useful Life: ${asset.usefulLife} yrs | Dep Rate: ${asset.depRate}% | Scrap: ₹${asset.scrap} | Purchased: ${asset.purchaseDate}`,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ Created "${asset.name}" OB: ${asset.cost} Dr`);
  }

  // 3. Create "Other Fixed Assets" for the balance
  const otherExists23 = await db.collection('acc_ledgers').findOne({
    financialYear: '2023-24', name: 'Other Fixed Assets',
  });
  if (otherExists23) {
    console.log(`  ⏭ "Other Fixed Assets" already exists in 23-24 (OB: ${otherExists23.openingBalance}), skipping`);
  } else {
    await db.collection('acc_ledgers').insertOne({
    name: 'Other Fixed Assets',
    group: 'ASSET',
    subGroup: 'Fixed Assets',
    openingBalance: OTHER_FIXED_ASSETS,
    openingBalanceType: 'DEBIT',
    financialYear: '2023-24',
    isActive: true,
    description: 'Other fixed assets not individually listed in depreciation chart',
    createdAt: now,
    updatedAt: now,
  });
  console.log(`  ✓ Created "Other Fixed Assets" OB: ${OTHER_FIXED_ASSETS} Dr`);
  }

  // Verify TB still balanced
  const all23 = await db.collection('acc_ledgers').find({ financialYear: '2023-24', isActive: true }).toArray();
  let dr23 = 0, cr23 = 0;
  for (const l of all23) {
    const ob = l.openingBalance || 0;
    if (l.openingBalanceType === 'DEBIT') dr23 += ob;
    else cr23 += ob;
  }
  console.log(`  TB Check: Dr ${dr23} | Cr ${cr23} | Diff ${dr23 - cr23} ${Math.abs(dr23 - cr23) < 1 ? '✅' : '❌'}`);

  // ═══════════════════════════════════════════════════
  // FY 24-25: Create asset ledgers + depreciation vouchers
  // ═══════════════════════════════════════════════════
  console.log('\n─── FY 24-25: Creating Asset Ledgers + Depreciation Vouchers ───');

  // Check if FY 24-25 exists
  const fy2425 = await db.collection('acc_financial_years').findOne({ code: '2024-25' });
  if (!fy2425) {
    console.log('  ⚠ FY 2024-25 not found! Creating...');
    await db.collection('acc_financial_years').insertOne({
      code: '2024-25',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
      companyName: 'Upamnyu International Education Pvt. Ltd.',
      isClosed: false,
      isLocked: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 1. Create individual asset ledgers for FY 24-25 (OB = cost from 23-24)
  for (const asset of ASSETS) {
    // Check if already exists
    const exists = await db.collection('acc_ledgers').findOne({
      financialYear: '2024-25',
      name: asset.name,
    });
    if (exists) {
      console.log(`  ⏭ "${asset.name}" already exists in 24-25, skipping`);
      continue;
    }
    await db.collection('acc_ledgers').insertOne({
      name: asset.name,
      group: 'ASSET',
      subGroup: 'Fixed Assets',
      openingBalance: asset.cost,
      openingBalanceType: 'DEBIT',
      financialYear: '2024-25',
      isActive: true,
      description: `Fixed Asset — Cost: ₹${asset.cost.toLocaleString('en-IN')} | Useful Life: ${asset.usefulLife} yrs | Dep Rate: ${asset.depRate}% | Scrap: ₹${asset.scrap} | Net Block 31/03/25: ₹${asset.netBlock2425.toLocaleString('en-IN')}`,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ Created "${asset.name}" OB: ${asset.cost} Dr`);
  }

  // Other Fixed Assets
  const otherExists = await db.collection('acc_ledgers').findOne({
    financialYear: '2024-25', name: 'Other Fixed Assets',
  });
  if (!otherExists) {
    await db.collection('acc_ledgers').insertOne({
      name: 'Other Fixed Assets',
      group: 'ASSET',
      subGroup: 'Fixed Assets',
      openingBalance: OTHER_FIXED_ASSETS,
      openingBalanceType: 'DEBIT',
      financialYear: '2024-25',
      isActive: true,
      description: 'Other fixed assets not individually listed',
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ Created "Other Fixed Assets" OB: ${OTHER_FIXED_ASSETS} Dr`);
  }

  // 2. Create depreciation expense ledgers for FY 24-25
  for (const asset of ASSETS) {
    const depName = `Depreciation on ${asset.name}`;
    const depExists = await db.collection('acc_ledgers').findOne({
      financialYear: '2024-25', name: depName,
    });
    if (depExists) {
      console.log(`  ⏭ "${depName}" already exists, skipping`);
      continue;
    }
    await db.collection('acc_ledgers').insertOne({
      name: depName,
      group: 'EXPENSE',
      subGroup: 'Depreciation',
      openingBalance: 0,
      openingBalanceType: 'DEBIT',
      financialYear: '2024-25',
      isActive: true,
      description: `Depreciation @ ${asset.depRate}% on ${asset.name} (${asset.usefulLife} yr useful life)`,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ Created "${depName}" (Expense) OB: 0`);
  }

  // 3. Ensure "Depreciation" group exists in 24-25
  const depGroup = await db.collection('acc_groups').findOne({
    financialYear: '2024-25', name: 'Depreciation',
  });
  if (!depGroup) {
    await db.collection('acc_groups').insertOne({
      name: 'Depreciation',
      nature: 'EXPENSE',
      report: 'profit_loss',
      financialYear: '2024-25',
      affectsGrossProfit: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ Created "Depreciation" group`);
  }

  // Ensure "Fixed Assets" group exists in 24-25
  const faGroup = await db.collection('acc_groups').findOne({
    financialYear: '2024-25', name: 'Fixed Assets',
  });
  if (!faGroup) {
    await db.collection('acc_groups').insertOne({
      name: 'Fixed Assets',
      nature: 'ASSET',
      report: 'balance_sheet',
      financialYear: '2024-25',
      affectsGrossProfit: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ Created "Fixed Assets" group`);
  }

  // 4. Create depreciation Journal vouchers for FY 24-25
  // Each asset gets its own voucher: Dr Depreciation on X / Cr X
  console.log('\n  Creating depreciation vouchers (FY 24-25)...');

  const voucherDate = new Date('2025-03-31');
  let voucherNum = 1;

  for (const asset of ASSETS) {
    if (asset.dep2425 <= 0) continue;

    const depLedgerName = `Depreciation on ${asset.name}`;

    // Check if voucher already exists
    const vExists = await db.collection('acc_vouchers').findOne({
      financialYear: '2024-25',
      narration: { $regex: `Depreciation.*${asset.name}`, $options: 'i' },
    });
    if (vExists) {
      console.log(`  ⏭ Dep voucher for "${asset.name}" already exists, skipping`);
      continue;
    }

    // Get ledger IDs
    const assetLedger = await db.collection('acc_ledgers').findOne({
      financialYear: '2024-25', name: asset.name,
    });
    const depLedger = await db.collection('acc_ledgers').findOne({
      financialYear: '2024-25', name: depLedgerName,
    });

    if (!assetLedger || !depLedger) {
      console.log(`  ❌ Missing ledger for "${asset.name}" or "${depLedgerName}"`);
      continue;
    }

    await db.collection('acc_vouchers').insertOne({
      voucherNumber: `DEP-2425-${String(voucherNum).padStart(3, '0')}`,
      type: 'JOURNAL',
      date: voucherDate,
      financialYear: '2024-25',
      narration: `Depreciation on ${asset.name} @ ${asset.depRate}% for FY 2024-25 (${asset.usefulLife} yr useful life, Companies Act 2013)`,
      entries: [
        {
          ledgerId: String(assetLedger._id),
          ledgerName: asset.name,
          amount: asset.dep2425,
          type: 'CREDIT',
        },
        {
          ledgerId: String(depLedger._id),
          ledgerName: depLedgerName,
          amount: asset.dep2425,
          type: 'DEBIT',
        },
      ],
      isReversed: false,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`  ✓ DEP-2425-${String(voucherNum).padStart(3, '0')}: Dr ${depLedgerName} ${asset.dep2425} / Cr ${asset.name} ${asset.dep2425}`);
    voucherNum++;
  }

  // 5. Verify closing net blocks match chart
  console.log('\n─── FY 24-25: Verification ───');
  console.log('  Asset closing net blocks (OB - Dep Voucher):');
  let totalClosing = 0;
  for (const asset of ASSETS) {
    const closing = asset.cost - asset.dep2425;
    totalClosing += closing;
    const match = closing === asset.netBlock2425 ? '✅' : '❌';
    console.log(`    ${asset.name.padEnd(28)} ${asset.cost} - ${asset.dep2425} = ${closing} (chart: ${asset.netBlock2425}) ${match}`);
  }
  console.log(`  Other Fixed Assets: ${OTHER_FIXED_ASSETS} (no dep computed)`);
  console.log(`  Total Net Block: ${totalClosing + OTHER_FIXED_ASSETS}`);
  console.log(`  Total Depreciation: ${TOTAL_DEP_2425}`);

  // Count final state
  const l25 = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();
  const v25 = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  const g25 = await db.collection('acc_groups').find({ financialYear: '2024-25' }).toArray();
  console.log(`\n  FY 24-25 totals: ${l25.length} ledgers, ${v25.length} vouchers, ${g25.length} groups`);

  console.log('\n═══ DONE ═══\n');
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
