const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const vouchers = mongoose.connection.collection('tally_manual_vouchers');
  const balances = mongoose.connection.collection('tally_manual_balances');

  // 1. All Mohan payments from vouchers
  console.log('=== MOHAN PAYMENTS (Vouchers) ===');
  const mohan = await vouchers.find({ financialYear: '2024-25', ledgerName: 'MOHAN KALBURGI' }).sort({ date: 1 }).toArray();
  let mohanTotal = 0;
  mohan.forEach(v => { console.log(`  ${v.date} | ₹${v.amount} | ${v.voucherType}`); mohanTotal += v.amount; });
  console.log(`  TOTAL: ₹${mohanTotal}`);

  // 2. All Upamanyu payments from vouchers
  console.log('\n=== UPAMANYU PAYMENTS (Vouchers) ===');
  const upa = await vouchers.find({ financialYear: '2024-25', ledgerName: 'UPAMNYU KALBURGI' }).sort({ date: 1 }).toArray();
  let upaTotal = 0;
  upa.forEach(v => { console.log(`  ${v.date} | ₹${v.amount} | ${v.voucherType}`); upaTotal += v.amount; });
  console.log(`  TOTAL: ₹${upaTotal}`);

  // 3. Teacher Remuneration payments
  console.log('\n=== TEACHER REMUNERATION (Vouchers) ===');
  const teacher = await vouchers.find({ financialYear: '2024-25', ledgerName: 'TEACHER REMUNERATION' }).sort({ date: 1 }).toArray();
  let teacherTotal = 0;
  teacher.forEach(v => { console.log(`  ${v.date} | ₹${v.amount} | ${v.voucherType}`); teacherTotal += v.amount; });
  console.log(`  TOTAL: ₹${teacherTotal}`);

  // 4. Pandurang, Turya, Shubham (staff?)
  console.log('\n=== OTHER STAFF PAYMENTS (Vouchers) ===');
  const staff = await vouchers.find({ financialYear: '2024-25', ledgerName: { $in: ['PANDURANG', 'TURYA MOHAN', 'SHUBHAM'] } }).sort({ ledgerName: 1, date: 1 }).toArray();
  let staffTotal = 0;
  const staffByName = {};
  staff.forEach(v => { 
    staffByName[v.ledgerName] = (staffByName[v.ledgerName] || 0) + v.amount;
    staffTotal += v.amount; 
  });
  Object.entries(staffByName).forEach(([n, t]) => console.log(`  ${n}: ₹${t}`));
  console.log(`  TOTAL STAFF: ₹${staffTotal}`);

  // 5. Current balance entries
  console.log('\n=== CURRENT BALANCE ENTRIES (FY 2024-25) ===');
  const all = await balances.find({ financialYear: '2024-25' }).sort({ category: 1, ledgerName: 1 }).toArray();
  let totalDr = 0, totalCr = 0;
  for (const e of all) {
    console.log(`  ${e.category} | ${e.ledgerName}: ₹${e.amount} ${e.drCr} | ${e.parentGroup}`);
    if (e.drCr === 'Dr') totalDr += e.amount; else totalCr += e.amount;
  }
  console.log(`\n  Total entries: ${all.length}`);
  console.log(`  Dr: ₹${totalDr}  Cr: ₹${totalCr}  Gap: ₹${totalDr - totalCr}`);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Mohan voucher total: ₹${mohanTotal} → Salary ₹75,000, Resort: ₹${mohanTotal - 75000}`);
  console.log(`Upamanyu voucher total: ₹${upaTotal} → Salary ₹36,000, Resort: ₹${upaTotal - 36000}`);
  console.log(`Teacher Remuneration voucher: ₹${teacherTotal}`);
  console.log(`Other Staff: ₹${staffTotal}`);
  console.log(`Extra to Resort: ₹${(mohanTotal - 75000) + (upaTotal - 36000)}`);
  console.log(`Current Resort (CWIP): ₹350000`);
  console.log(`New Resort total: ₹${350000 + (mohanTotal - 75000) + (upaTotal - 36000)}`);

  await mongoose.disconnect();
})();
