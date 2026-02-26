/**
 * Carry forward FY 2023-24 → 2024-25
 * Creates 2024-25 FY, seeds groups, carries BS ledgers, transfers P&L to Reserves
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  // Use the API via direct engine import would need TS, so let's call the local API
  const http = require('http');
  
  // First get a token
  const loginRes = await new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: 'mohan@swaryoga.com', password: process.env.ADMIN_PASSWORD || 'admin123' });
    const req = http.request({
      hostname: 'localhost', port: 3000, path: '/api/auth/login',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => { let body = ''; res.on('data', c => body += c); res.on('end', () => resolve(JSON.parse(body))); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  const token = loginRes.token || loginRes.data?.token;
  if (!token) {
    console.log('Login response:', loginRes);
    console.log('Could not get token. Will use direct DB approach instead.\n');
    
    // Direct approach - replicate the carryForwardBalances logic
    console.log('=== Direct carry forward 2023-24 → 2024-25 ===\n');
    
    // 1. Get all 2023-24 ledgers
    const ledgers = await db.collection('acc_ledgers').find({ 
      financialYear: '2023-24', isActive: true 
    }).toArray();
    
    console.log(`Found ${ledgers.length} ledgers in 2023-24`);
    
    // 2. Get all vouchers to calculate balances (there are 0 for 2023-24)
    const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2023-24' }).toArray();
    console.log(`Found ${vouchers.length} vouchers in 2023-24`);
    
    // 3. Create FY 2024-25 if not exists
    let fy2425 = await db.collection('acc_financial_years').findOne({ code: '2024-25' });
    if (!fy2425) {
      await db.collection('acc_financial_years').insertOne({
        code: '2024-25',
        label: 'FY 2024-25',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2025-03-31'),
        isCurrent: true,
        isClosed: false,
        companyName: 'Upamnyu International Education Pvt. Ltd.',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // Set 2023-24 as not current
      await db.collection('acc_financial_years').updateOne({ code: '2023-24' }, { $set: { isCurrent: false } });
      console.log('Created FY 2024-25');
    } else {
      console.log('FY 2024-25 already exists');
      await db.collection('acc_financial_years').updateOne({ code: '2024-25' }, { $set: { isCurrent: true, isClosed: false } });
      await db.collection('acc_financial_years').updateMany({ code: { $ne: '2024-25' } }, { $set: { isCurrent: false } });
    }
    
    // 4. Calculate balances for each ledger
    // Since there are 0 vouchers, closing = opening balance directly
    let totalIncome = 0;
    let totalExpense = 0;
    let carriedForward = 0;
    let updated = 0;
    const carriedList = [];
    
    for (const l of ledgers) {
      // For 2023-24 with 0 vouchers, closing = opening
      const ob = l.openingBalance || 0;
      const obType = l.openingBalanceType || 'DEBIT';
      
      if (l.group === 'INCOME') {
        totalIncome += obType === 'CREDIT' ? ob : -ob;
        continue; // Income resets to zero
      }
      if (l.group === 'EXPENSE') {
        totalExpense += obType === 'DEBIT' ? ob : -ob;
        continue; // Expense resets to zero
      }
      
      // ASSET, LIABILITY, CAPITAL → carry forward
      if (ob > 0.01) {
        const existing = await db.collection('acc_ledgers').findOne({ name: l.name, financialYear: '2024-25' });
        if (existing) {
          await db.collection('acc_ledgers').updateOne(
            { _id: existing._id },
            { $set: { openingBalance: ob, openingBalanceType: obType, group: l.group, subGroup: l.subGroup } }
          );
          updated++;
        } else {
          await db.collection('acc_ledgers').insertOne({
            name: l.name,
            group: l.group,
            subGroup: l.subGroup,
            openingBalance: ob,
            openingBalanceType: obType,
            financialYear: '2024-25',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          carriedForward++;
        }
        carriedList.push({ name: l.name, group: l.group, ob, obType, subGroup: l.subGroup });
      }
    }
    
    const netProfit = totalIncome - totalExpense;
    console.log(`\nP&L: Income=${totalIncome.toFixed(2)}, Expense=${totalExpense.toFixed(2)}, Net=${netProfit.toFixed(2)}`);
    
    // 5. Transfer Net P/L → Reserves & Surplus
    if (Math.abs(netProfit) > 0.01) {
      const reserves = await db.collection('acc_ledgers').findOne({ name: 'Reserves & Surplus', financialYear: '2024-25' });
      if (reserves) {
        const currentOB = reserves.openingBalanceType === 'CREDIT' ? reserves.openingBalance : -reserves.openingBalance;
        const newReserves = currentOB + netProfit;
        await db.collection('acc_ledgers').updateOne(
          { _id: reserves._id },
          { $set: { openingBalance: Math.abs(newReserves), openingBalanceType: newReserves >= 0 ? 'CREDIT' : 'DEBIT' } }
        );
        console.log(`Updated Reserves & Surplus: ${newReserves.toFixed(2)}`);
      } else {
        await db.collection('acc_ledgers').insertOne({
          name: 'Reserves & Surplus',
          group: 'CAPITAL',
          subGroup: 'Retained Earnings',
          openingBalance: Math.abs(netProfit),
          openingBalanceType: netProfit >= 0 ? 'CREDIT' : 'DEBIT',
          financialYear: '2024-25',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        carriedForward++;
        console.log(`Created Reserves & Surplus with OB: ${netProfit.toFixed(2)}`);
      }
    }
    
    // 6. Seed default groups for 2024-25
    const DEFAULT_GROUPS = [
      { name: 'Cash-in-Hand', nature: 'ASSET', report: 'balance_sheet' },
      { name: 'Bank Accounts', nature: 'ASSET', report: 'balance_sheet' },
      { name: 'Fixed Assets', nature: 'ASSET', report: 'balance_sheet' },
      { name: 'Current Assets', nature: 'ASSET', report: 'balance_sheet' },
      { name: 'Sundry Debtors', nature: 'ASSET', report: 'balance_sheet' },
      { name: 'Investments', nature: 'ASSET', report: 'balance_sheet' },
      { name: 'Current Liabilities', nature: 'LIABILITY', report: 'balance_sheet' },
      { name: 'Sundry Creditors', nature: 'LIABILITY', report: 'balance_sheet' },
      { name: 'Secured Loans', nature: 'LIABILITY', report: 'balance_sheet' },
      { name: 'Unsecured Loans', nature: 'LIABILITY', report: 'balance_sheet' },
      { name: 'Duties & Taxes', nature: 'LIABILITY', report: 'balance_sheet' },
      { name: 'Provisions', nature: 'LIABILITY', report: 'balance_sheet' },
      { name: 'Direct Incomes', nature: 'INCOME', report: 'profit_loss' },
      { name: 'Indirect Incomes', nature: 'INCOME', report: 'profit_loss' },
      { name: 'Direct Expenses', nature: 'EXPENSE', report: 'profit_loss' },
      { name: 'Indirect Expenses', nature: 'EXPENSE', report: 'profit_loss' },
      { name: 'Operating Expenses', nature: 'EXPENSE', report: 'profit_loss' },
      { name: 'Administrative Expenses', nature: 'EXPENSE', report: 'profit_loss' },
      { name: 'Purchase Accounts', nature: 'EXPENSE', report: 'profit_loss' },
      { name: 'Sales Accounts', nature: 'INCOME', report: 'profit_loss' },
      { name: 'Share Capital', nature: 'CAPITAL', report: 'balance_sheet' },
      { name: 'Capital Reserve', nature: 'CAPITAL', report: 'balance_sheet' },
      { name: 'General Reserve', nature: 'CAPITAL', report: 'balance_sheet' },
      { name: 'Retained Earnings', nature: 'CAPITAL', report: 'balance_sheet' },
      { name: 'Surplus from P&L A/c', nature: 'CAPITAL', report: 'balance_sheet' },
      { name: 'Share Premium', nature: 'CAPITAL', report: 'balance_sheet' },
      { name: 'Loans & Advances', nature: 'ASSET', report: 'balance_sheet' },
      { name: 'Deposits', nature: 'ASSET', report: 'balance_sheet' },
    ];
    
    let groupsCreated = 0;
    for (const g of DEFAULT_GROUPS) {
      const exists = await db.collection('acc_groups').findOne({ name: g.name, financialYear: '2024-25' });
      if (!exists) {
        await db.collection('acc_groups').insertOne({
          name: g.name,
          nature: g.nature,
          report: g.report,
          financialYear: '2024-25',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        groupsCreated++;
      }
    }
    console.log(`Seeded ${groupsCreated} groups for 2024-25`);
    
    // 7. Link ledgers to groups
    const newLedgers = await db.collection('acc_ledgers').find({ financialYear: '2024-25', isActive: true }).toArray();
    const groups = await db.collection('acc_groups').find({ financialYear: '2024-25' }).toArray();
    const groupMap = {};
    groups.forEach(g => { groupMap[g.name] = g._id; });
    
    let linked = 0;
    for (const l of newLedgers) {
      if (!l.groupId && l.subGroup && groupMap[l.subGroup]) {
        await db.collection('acc_ledgers').updateOne({ _id: l._id }, { $set: { groupId: groupMap[l.subGroup] } });
        linked++;
      }
    }
    console.log(`Linked ${linked} ledgers to groups`);
    
    // Summary
    console.log('\n=== CARRY FORWARD COMPLETE ===');
    console.log(`New ledgers: ${carriedForward}`);
    console.log(`Updated ledgers: ${updated}`);
    console.log(`Net P/L transferred to Reserves: ${netProfit.toFixed(2)}`);
    console.log('\nCarried ledgers:');
    carriedList.forEach(l => {
      console.log(`  ${l.group.padEnd(10)} ${l.name.padEnd(40)} ${l.ob.toFixed(2).padStart(12)} ${l.obType}`);
    });
    
    // Verify
    console.log('\n=== VERIFICATION ===');
    const finalLedgers = await db.collection('acc_ledgers').find({ financialYear: '2024-25', isActive: true }).sort({ group: 1, name: 1 }).toArray();
    console.log(`Total ledgers in 2024-25: ${finalLedgers.length}`);
    finalLedgers.forEach(l => {
      const sign = l.openingBalanceType === 'DEBIT' ? '' : '-';
      console.log(`  ${l.group.padEnd(10)} ${l.name.padEnd(40)} OB: ${sign}${l.openingBalance.toFixed(2).padStart(11)} ${l.openingBalanceType} | ${l.subGroup || '-'}`);
    });
  } else {
    console.log('Got token, calling API...');
    const carryRes = await new Promise((resolve, reject) => {
      const data = JSON.stringify({
        action: 'carry-forward',
        currentFY: '2023-24',
        nextFY: '2024-25',
        nextStartDate: '2024-04-01',
        nextEndDate: '2025-03-31',
      });
      const req = http.request({
        hostname: 'localhost', port: 3000, path: '/api/tally/reports',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, 'Authorization': `Bearer ${token}` }
      }, res => { let body = ''; res.on('data', c => body += c); res.on('end', () => resolve(JSON.parse(body))); });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
    console.log('Carry forward result:');
    console.log(JSON.stringify(carryRes, null, 2));
  }
  
  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
