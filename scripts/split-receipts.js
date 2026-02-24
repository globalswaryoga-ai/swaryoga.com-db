#!/usr/bin/env node
/**
 * Split Receipt Vouchers: Separate Income from Investment
 * 
 * Current state: 12 monthly Receipt vouchers mixing income + investment = ₹10,79,287
 * Target: 
 *   - Income Receipt vouchers (monthly, party = "Swar Yoga") 
 *   - Investment Receipt vouchers (per investor, party = investor name)
 *
 * Data source: Classified bank statement (/Users/mohankalburgi/Downloads/SwarYoga_FY2024-25_Classified.xlsx)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient, ObjectId } = require('mongodb');

const CRM_DB = 'swaryoga_admin_crm';
const FY = '2024-25';

// ── MONTHLY INCOME (from classified Excel, EXCLUDING investment/contra/refund) ──
const MONTHLY_INCOME = [
  { month: 'April 2024',     date: '2024-04-30', amount: 44601.00 },
  { month: 'May 2024',       date: '2024-05-31', amount: 31501.00 },
  { month: 'June 2024',      date: '2024-06-30', amount: 51001.00 },
  { month: 'July 2024',      date: '2024-07-31', amount: 4001.00 },
  { month: 'August 2024',    date: '2024-08-31', amount: 1.00 },
  { month: 'September 2024', date: '2024-09-30', amount: 5709.94 },
  { month: 'October 2024',   date: '2024-10-31', amount: 11999.00 },
  { month: 'November 2024',  date: '2024-11-30', amount: 70599.88 },
  { month: 'December 2024',  date: '2024-12-31', amount: 51998.60 },
  { month: 'January 2025',   date: '2025-01-31', amount: 15388.68 },
  { month: 'February 2025',  date: '2025-02-28', amount: 14155.76 },
  { month: 'March 2025',     date: '2025-03-31', amount: 42259.62 },
];

// ── INVESTMENT ENTRIES (from classified Excel, individual deposits) ──
const INVESTMENT_ENTRIES = [
  // April 2024 investments
  { date: '2024-04-17', investor: 'Prashant Pawar', amount: 50000, narration: 'NEFT - Prashant Rajaram Pawar (HDFC)' },
  { date: '2024-04-19', investor: 'Dipesh Walecha', amount: 25000, narration: 'UPI - Dipesh Valecha' },
  { date: '2024-04-19', investor: 'Subir Jha', amount: 1000, narration: 'UPI - Subir Jha' },
  { date: '2024-04-19', investor: 'Minakshi Jha', amount: 99003, narration: 'UPI - Minakshi Jha' },
  { date: '2024-04-23', investor: 'Manjinder Kaur', amount: 5000, narration: 'UPI - Manjinder Kaur' },
  { date: '2024-04-23', investor: 'Manjinder Kaur', amount: 45000, narration: 'UPI - Manjinder Kaur' },
  // May 2024
  { date: '2024-05-03', investor: 'Damayanti Gajra', amount: 25000, narration: 'NEFT - Damayanti M Gajra (ICICI)' },
  { date: '2024-05-23', investor: 'Anshu', amount: 31000, narration: 'UPI - Anshu (Paytm)' },
  { date: '2024-05-27', investor: 'Prashant Pawar', amount: 25000, narration: 'NEFT - Prashant Rajaram Pawar (HDFC)' },
  // June 2024
  { date: '2024-06-12', investor: 'Pakhi Bhartia', amount: 25000, narration: 'MB - Pakhi Bhartia (Guruji)' },
  { date: '2024-06-12', investor: 'Supriyo Ghoshal', amount: 50000, narration: 'NEFT - Supriyo Ghoshal (ICICI)' },
  // July 2024
  { date: '2024-07-24', investor: 'Meeta Vaid', amount: 25000, narration: 'IMPS - Meeta Vaid (Kotak)' },
  // August 2024
  { date: '2024-08-22', investor: 'Anshu', amount: 20000, narration: 'UPI - Anshu (Paytm)' },
  { date: '2024-08-23', investor: 'Hitesh Valecha', amount: 50000, narration: 'UPI - Hitesh Valecha' },
  { date: '2024-08-23', investor: 'Ankur Ukey', amount: 25000, narration: 'NEFT - Ankur Ukey (ICICI)' },
  // September 2024
  { date: '2024-09-03', investor: 'Arvind Kumar', amount: 25000, narration: 'UPI - Arvind Kumar (Paytm)' },
  { date: '2024-09-03', investor: 'Mahesh Chandra Agrawal', amount: 100000, narration: 'NEFT - Mahesh Chandra Agrawal (CBI)' },
  { date: '2024-09-03', investor: 'Arvind Kumar', amount: 25000, narration: 'UPI - Arvind Kumar (Paytm)' },
  // November 2024
  { date: '2024-11-05', investor: 'Poonam Singh', amount: 50000, narration: 'IMPS - Poonam Singh (Kotak)' },
  { date: '2024-11-12', investor: 'Avinash Pratap', amount: 100000, narration: 'NEFT - Avinash Pratap' },
  // March 2025
  { date: '2025-03-20', investor: 'Dhanish Rawat', amount: 60004.72, narration: 'NEFT - Dhanish Rawat (SBI)' },
];

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run');
  
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db(CRM_DB);
  const col = db.collection('tally_manual_vouchers');
  
  // ── STEP 1: Show current state ──
  const oldReceipts = await col.find({ financialYear: FY, voucherType: 'Receipt' }).sort({ date: 1 }).toArray();
  console.log(`\n=== CURRENT STATE ===`);
  console.log(`Existing Receipt vouchers: ${oldReceipts.length}`);
  const oldTotal = oldReceipts.reduce((s, r) => s + r.amount, 0);
  console.log(`Total: Rs ${oldTotal.toFixed(2)}`);
  oldReceipts.forEach(r => console.log(`  ${r.voucherNumber} | ${r.date} | Rs ${r.amount} | ${r.ledgerName}`));
  
  // ── STEP 2: Calculate new totals ──
  const incomeTotal = MONTHLY_INCOME.reduce((s, m) => s + m.amount, 0);
  const investTotal = INVESTMENT_ENTRIES.reduce((s, e) => s + e.amount, 0);
  console.log(`\n=== NEW STATE (planned) ===`);
  console.log(`Income receipts: 12 months, total Rs ${incomeTotal.toFixed(2)}`);
  console.log(`Investment receipts: ${INVESTMENT_ENTRIES.length} entries, total Rs ${investTotal.toFixed(2)}`);
  console.log(`Grand total: Rs ${(incomeTotal + investTotal).toFixed(2)}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - no changes made. Remove --dry-run to execute.');
    await client.close();
    return;
  }
  
  // ── STEP 3: Delete old receipt vouchers ──
  const deleteResult = await col.deleteMany({ financialYear: FY, voucherType: 'Receipt' });
  console.log(`\n✅ Deleted ${deleteResult.deletedCount} old Receipt vouchers`);
  
  // ── STEP 4: Create income receipt vouchers (monthly) ──
  const incomeVouchers = MONTHLY_INCOME
    .filter(m => m.amount > 0)
    .map((m, i) => ({
    _id: new ObjectId().toString(),
    voucherType: 'Receipt',
    voucherNumber: `RCP-${String(i + 1).padStart(4, '0')}`,
    date: m.date,
    partyName: 'Swar Yoga',
    ledgerName: `Course Fees - ${m.month}`,
    amount: m.amount,
    narration: `[Cr] Swar Yoga Course Income - ${m.month} (Bank deposits: Swar Yoga L-1, Basic Swar Yoga, Weight Loss, etc.)`,
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'system-import',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  
  if (incomeVouchers.length > 0) {
    await col.insertMany(incomeVouchers);
    console.log(`✅ Created ${incomeVouchers.length} Income Receipt vouchers`);
    incomeVouchers.forEach(v => console.log(`  ${v.voucherNumber} | ${v.date} | Rs ${v.amount} | ${v.ledgerName}`));
  }
  
  // ── STEP 5: Create investment receipt vouchers (per investor) ──
  const investVouchers = INVESTMENT_ENTRIES.map((e, i) => ({
    _id: new ObjectId().toString(),
    voucherType: 'Receipt',
    voucherNumber: `INV-${String(i + 1).padStart(4, '0')}`,
    date: e.date,
    partyName: e.investor,
    ledgerName: 'Investment Received',
    amount: e.amount,
    narration: `[Cr] Capital Investment - ${e.investor} | ${e.narration}`,
    paymentMode: 'Bank',
    financialYear: FY,
    createdBy: 'system-import',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  
  await col.insertMany(investVouchers);
  console.log(`✅ Created ${investVouchers.length} Investment Receipt vouchers`);
  investVouchers.forEach(v => console.log(`  ${v.voucherNumber} | ${v.date} | Rs ${v.amount} | ${v.partyName}`));
  
  // ── STEP 6: Verify ──
  const newReceipts = await col.find({ financialYear: FY, voucherType: 'Receipt' }).toArray();
  const newIncome = newReceipts.filter(r => r.ledgerName.startsWith('Course Fees'));
  const newInvest = newReceipts.filter(r => r.ledgerName === 'Investment Received');
  
  console.log(`\n=== VERIFICATION ===`);
  console.log(`Total Receipt vouchers: ${newReceipts.length}`);
  console.log(`  Income: ${newIncome.length} vouchers, Rs ${newIncome.reduce((s,r) => s + r.amount, 0).toFixed(2)}`);
  console.log(`  Investment: ${newInvest.length} vouchers, Rs ${newInvest.reduce((s,r) => s + r.amount, 0).toFixed(2)}`);
  
  // Total voucher count
  const totalCount = await col.countDocuments({ financialYear: FY });
  console.log(`\nTotal FY 2024-25 vouchers: ${totalCount}`);
  
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
