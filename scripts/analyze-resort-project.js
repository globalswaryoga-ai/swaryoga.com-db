// Analyze Resort Project, Meera/Turya, Dividend payments
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');

  // Get all Resort Project vouchers
  const resort = await db.collection('acc_vouchers').find({
    financialYear: '2024-25',
    'entries.ledgerName': 'Swar Yoga Resort Project'
  }).sort({ date: 1 }).toArray();

  console.log('=== SWAR YOGA RESORT PROJECT ENTRIES ===');
  console.log('Total: ' + resort.length + ' vouchers = Rs ' + resort.reduce((s, v) => s + v.totalDebit, 0).toFixed(2));

  // Break down by person/description
  const byPerson = {};
  for (const v of resort) {
    const narr = v.narration.toUpperCase();
    let person = 'Other';
    if (narr.includes('MOHAN PANDURANG') || narr.match(/^UPI\/MOHAN\s/)) person = 'Mohan Pandurang';
    else if (narr.includes('UPAMANYU') || narr.includes('UPAMNYU')) person = 'Upamanyu';
    else if (narr.includes('LAXMI MOHAN')) person = 'Laxmi Mohan';
    else if (narr.includes('TURYA MOHAN')) person = 'Turya Mohan';
    else if (narr.includes('PANDURANG KRISH')) person = 'Pandurang Krish';
    else if (narr.includes('ARVIND')) person = 'Arvind';
    else if (narr.includes('SACHIN KALRA')) person = 'Sachin Kalra';
    else if (narr.includes('KIRANKUMAR')) person = 'Kirankumar';
    else if (narr.includes('SMITA')) person = 'Smita';
    else if (narr.includes('SWAR')) person = 'Swar Yoga Transfer';
    else if (narr.includes('DIVIDEND')) person = 'Dividend';
    else if (narr.includes('SONU GUPTA')) person = 'Sonu Gupta (Dividend)';
    
    if (!byPerson[person]) byPerson[person] = { count: 0, total: 0, items: [] };
    byPerson[person].count++;
    byPerson[person].total += v.totalDebit;
    byPerson[person].items.push(v);
  }

  let runningTotal = 0;
  Object.entries(byPerson).sort((a, b) => b[1].total - a[1].total).forEach(([p, data]) => {
    runningTotal += data.total;
    console.log('\n--- ' + p + ': ' + data.count + ' txns = Rs ' + data.total.toFixed(2) + ' ---');
    data.items.forEach(v => {
      const d = new Date(v.date);
      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      console.log('  ' + v.voucherNumber + ' | ' + dateStr + ' | Rs ' + v.totalDebit + ' | ' + v.narration.substring(0, 70));
    });
  });

  // Now find Dividend-related payments specifically
  console.log('\n\n=== DIVIDEND-RELATED PAYMENTS (in all vouchers) ===');
  const allV = await db.collection('acc_vouchers').find({
    financialYear: '2024-25',
    narration: { $regex: /dividend/i }
  }).toArray();
  allV.forEach(v => {
    console.log(v.voucherNumber + ' | Rs ' + v.totalDebit + ' | ' + v.narration);
    v.entries.forEach(e => console.log('  ' + e.ledgerName + ' ' + e.type + ' Rs ' + e.amount));
  });

  // Find Meera/Turya specific
  console.log('\n\n=== TURYA PAYMENTS (in all vouchers) ===');
  const turya = await db.collection('acc_vouchers').find({
    financialYear: '2024-25',
    narration: { $regex: /turya/i }
  }).toArray();
  turya.forEach(v => {
    const d = new Date(v.date);
    console.log(v.voucherNumber + ' | ' + d.toLocaleDateString('en-IN') + ' | Rs ' + v.totalDebit + ' | ' + v.narration.substring(0, 70));
  });

  // Search for "Meera" or person names that could be teachers
  console.log('\n\n=== SEARCH FOR MEERA/TEACHER PAYMENTS ===');
  const meera = await db.collection('acc_vouchers').find({
    financialYear: '2024-25',
    narration: { $regex: /meera|swati|aarti|pathak|suryawanshi|jyotish|teaching/i }
  }).toArray();
  meera.forEach(v => {
    const ledgerName = v.entries[0]?.ledgerName;
    console.log(v.voucherNumber + ' | Rs ' + v.totalDebit + ' | ' + ledgerName + ' | ' + v.narration.substring(0, 80));
  });

  // Also find 6-month payments (likely teaching)
  console.log('\n\n=== 6-MONTH / TEACHING-RELATED PAYMENTS ===');
  const teaching = await db.collection('acc_vouchers').find({
    financialYear: '2024-25',
    narration: { $regex: /6 month|six month|month|rushi/i }
  }).toArray();
  teaching.forEach(v => {
    const ledgerName = v.entries[0]?.ledgerName;
    console.log(v.voucherNumber + ' | Rs ' + v.totalDebit + ' | ' + ledgerName + ' | ' + v.narration.substring(0, 80));
  });

  console.log('\n\n=== RESORT PROJECT TOTAL BY PERSON ===');
  runningTotal = 0;
  Object.entries(byPerson).sort((a, b) => b[1].total - a[1].total).forEach(([p, data]) => {
    runningTotal += data.total;
    console.log('  ' + p + ': Rs ' + data.total.toFixed(2) + ' (' + data.count + ' txns) | Running: Rs ' + runningTotal.toFixed(2));
  });
  console.log('\nTotal Resort Project: Rs ' + runningTotal.toFixed(2));
  console.log('Target range: Rs 3,50,000 - 3,75,000');
  console.log('Excess to move to expenses: Rs ' + (runningTotal - 350000).toFixed(2) + ' to ' + (runningTotal - 375000).toFixed(2));

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
