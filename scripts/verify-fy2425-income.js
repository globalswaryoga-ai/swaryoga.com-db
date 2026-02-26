const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('FY 2024-25 INCOME ENTRIES - VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Get all vouchers
  const vouchers = await db.collection('acc_vouchers')
    .find({ financialYear: '2024-25' })
    .sort({ voucherNumber: 1 })
    .toArray();
  
  // Categorize vouchers
  const investments = vouchers.filter(v => v.voucherNumber.startsWith('REC-2425'));
  const contra = vouchers.filter(v => v.voucherNumber.startsWith('CONTRA'));
  const workshop = vouchers.filter(v => v.voucherNumber.startsWith('REC-WS'));
  const depreciation = vouchers.filter(v => v.voucherNumber.startsWith('DEP'));
  
  console.log('1. INVESTMENT RECEIPTS (Preference Share Capital):');
  let totalInv = 0;
  investments.forEach(v => {
    const amt = v.entries[0].amount;
    totalInv += amt;
    console.log(`   ${v.voucherNumber} | ${v.date.toISOString().split('T')[0]} | Rs ${amt.toLocaleString()}`);
  });
  console.log(`   TOTAL: Rs ${totalInv.toLocaleString()}\n`);
  
  console.log('2. CONTRA (Cash to Bank):');
  let totalContra = 0;
  contra.forEach(v => {
    const amt = v.entries[0].amount;
    totalContra += amt;
    console.log(`   ${v.voucherNumber} | ${v.date.toISOString().split('T')[0]} | Rs ${amt.toLocaleString()}`);
  });
  console.log(`   TOTAL: Rs ${totalContra.toLocaleString()}\n`);
  
  console.log('3. OLD WORKSHOP FEES:');
  let totalWorkshop = 0;
  workshop.forEach(v => {
    const amt = v.entries[0].amount;
    totalWorkshop += amt;
    console.log(`   ${v.voucherNumber} | ${v.date.toISOString().split('T')[0]} | Rs ${amt.toLocaleString()}`);
  });
  console.log(`   TOTAL: Rs ${totalWorkshop.toLocaleString()}\n`);
  
  console.log('4. DEPRECIATION (Already existed):');
  depreciation.forEach(v => {
    console.log(`   ${v.voucherNumber} | ${v.date.toISOString().split('T')[0]}`);
  });
  console.log(`   COUNT: ${depreciation.length}\n`);
  
  // Get ledgers
  const ledgers = await db.collection('acc_ledgers')
    .find({ financialYear: '2024-25' })
    .toArray();
  
  const bankLedger = ledgers.find(l => l.name === 'Kotak Mahindra Bank');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total Ledgers: ${ledgers.length}`);
  console.log(`Total Vouchers: ${vouchers.length}`);
  console.log('');
  console.log('INCOME ENTRIES:');
  console.log(`  Investments (Pref Share Capital): Rs ${totalInv.toLocaleString()}`);
  console.log(`  Contra (Cash to Bank):            Rs ${totalContra.toLocaleString()}`);
  console.log(`  Old Workshop Fees:                Rs ${totalWorkshop.toLocaleString()}`);
  console.log('');
  console.log('BANK ACCOUNT:');
  console.log(`  Opening Balance: Rs ${bankLedger ? bankLedger.ob.toLocaleString() : 'N/A'}`);
  console.log(`  Expected Closing: Rs 43,750.97 (as per bank statement)`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  await m.disconnect();
})();
