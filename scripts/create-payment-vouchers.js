// Create ALL payment vouchers for FY 2024-25 bank debits
// Family payments → Swar Yoga Resort Project (Current Asset - Amount Receivable)
// Remaining > ₹1,000 → Liability Payment (reduce Short-Term Provisions ₹3,25,000)
// Rest → categorized expense heads

const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const DB_NAME = 'swaryoga_admin_crm';
const FY = '2024-25';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb(DB_NAME);
  const ledgerCol = db.collection('acc_ledgers');
  const voucherCol = db.collection('acc_vouchers');
  const now = new Date();

  // ── 1. Create "Swar Yoga Resort Project" ledger if not exists ──
  let resortLedger = await ledgerCol.findOne({ name: 'Swar Yoga Resort Project', financialYear: FY });
  if (!resortLedger) {
    const res = await ledgerCol.insertOne({
      name: 'Swar Yoga Resort Project',
      group: 'ASSET',
      subGroup: 'Current Assets',
      financialYear: FY,
      openingBalance: 0,
      balanceType: 'Dr',
      description: 'Resort project investment - Amount Receivable from directors/family',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    resortLedger = { _id: res.insertedId, name: 'Swar Yoga Resort Project' };
    console.log('CREATED ledger: Swar Yoga Resort Project (ASSET > Current Assets)');
  } else {
    console.log('EXISTS: Swar Yoga Resort Project');
  }

  // ── 2. Delete "Directors Drawings" ledger (not needed) ──
  await ledgerCol.deleteOne({ name: 'Directors Drawings', financialYear: FY });
  console.log('DELETED: Directors Drawings ledger (not needed)');

  // ── 3. Load all ledgers ──
  const allLedgers = await ledgerCol.find({ financialYear: FY }).toArray();
  const ledgerMap = {};
  allLedgers.forEach(l => { ledgerMap[l.name] = l; });

  const bankLedger = ledgerMap['Kotak Mahindra Bank'];
  if (!bankLedger) throw new Error('Bank ledger not found!');

  // ── 4. Parse bank debits ──
  const text = fs.readFileSync('/tmp/bank_statement.txt', 'utf8');
  const lines = text.split('\n');
  const allTxns = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*(\d+)\s+(\d{2}\s+\w{3}\s+\d{4})\s+(.+)/);
    if (!m) continue;
    const sn = parseInt(m[1]);
    const date = m[2];
    let rest = m[3];
    const amounts = [];
    const amtRegex = /([\d,]+\.\d{2})/g;
    let am;
    while ((am = amtRegex.exec(rest)) !== null) {
      amounts.push({ val: parseFloat(am[1].replace(/,/g, '')), pos: am.index });
    }
    if (amounts.length < 2) continue;
    const balance = amounts[amounts.length - 1].val;
    const descEnd = amounts[0].pos;
    let desc = rest.substring(0, descEnd).trim();
    allTxns.push({ sn, date, desc, amount: amounts[0].val, balance, lineNum: i });
  }

  allTxns.sort((a, b) => a.sn - b.sn);
  let prevBalance = 37440.78;
  const debits = [];

  for (const txn of allTxns) {
    const diff = txn.balance - prevBalance;
    if (Math.abs(diff + txn.amount) < 1) {
      txn.txnType = 'debit';
      debits.push(txn);
    }
    prevBalance = txn.balance;
  }

  console.log(`\nTotal debits to process: ${debits.length}`);

  // ── 5. Categorize each debit ──
  function categorize(d) {
    const desc = d.desc.toUpperCase();

    // Skip cash deposits (already Contra)
    if (desc.includes('CASH DEPOSIT')) return null;

    // ── FAMILY / RESORT PROJECT ──
    if (desc.includes('MOHAN PANDURANG') || (desc.match(/^UPI\/MOHAN\s/) && !desc.includes('UPAMANYU'))) return 'Swar Yoga Resort Project';
    if (desc.includes('UPAMANYU MOHAN') || desc.includes('UPAMANYU') || desc.includes('UPAMNYU')) return 'Swar Yoga Resort Project';
    if (desc.includes('LAXMI MOHAN')) return 'Swar Yoga Resort Project';
    if (desc.includes('TURYA MOHAN')) return 'Swar Yoga Resort Project';
    if (desc.includes('PANDURANG KRISH')) return 'Swar Yoga Resort Project';
    if (desc.includes('ARVIND KALBURGI') || desc.match(/UPI\/ARVIND\s/)) return 'Swar Yoga Resort Project';

    // IMPS family transfers
    if (desc.includes('SENTIMPS') || desc.includes('IMPS-')) {
      const impsMatch = desc.match(/SENTIMPS\d+(\w+)/i);
      const name = impsMatch ? impsMatch[1].toUpperCase() : '';
      if (['MOHAN', 'UPAMNYU', 'UPAMANYU', 'SWAR'].includes(name)) return 'Swar Yoga Resort Project';
      if (['KAILAS'].includes(name)) return 'Salary & Wages';
      if (['PRAMOD', 'MAHI', 'MINAKSHI', 'VISHAL', 'SANTOSH', 'MAHESH'].includes(name)) return 'Salary & Wages';
      // Bank charges on IMPS
      if (desc.includes('CHG:') || desc.includes('CHRG:')) return 'Bank Charges & Commission';
      return 'Miscellaneous Expenses';
    }

    // ── Sachin Kalra (Mohan Kalburgi related) ──
    if (desc.includes('SACHIN KALRA')) return 'Swar Yoga Resort Project';

    // ── Kirankumar Bhas (related) ──
    if (desc.includes('KIRANKUMAR BHAS')) return 'Swar Yoga Resort Project';

    // ── Facebook/Meta/Google Ads ──
    if (desc.includes('FACEBOOK') || desc.includes('META') || desc.includes('GOOGLE ADS') || desc.includes('FACEBOOKADS')) return 'Advertisement & Marketing';

    // ── Bank Charges ──
    if (desc.includes('CHG:') || desc.includes('CHRG:') || desc.includes('CHARGES') || desc.includes('ANNUAL FEE') || desc.includes('POS DECL')) return 'Bank Charges & Commission';

    // ── Software/Subscriptions ──
    if (desc.includes('ZOOM') || desc.includes('CANVA') || desc.includes('JIOCINEMA')) return 'Software & Subscriptions';
    if (desc.includes('GOOGLE') && !desc.includes('GOOGLE ADS')) return 'Software & Subscriptions';

    // ── Electricity (MSEDCL) ──
    if (desc.includes('MSEDCL') || desc.includes('BESCOM') || desc.includes('ELECTRIC')) return 'Electricity Charges';

    // ── Internet/Phone ──
    if (desc.includes('JIO PREPAID') || desc.includes('AIRTEL') || desc.includes('JIOPREPAID') || desc.includes('BSNL')) return 'Internet & Telephone';

    // ── Fuel ──
    if (desc.includes('PETROL') || desc.includes('FUEL') || desc.includes('BPCL') || desc.includes('IOCL') || desc.includes('INDIAN OIL') || desc.includes('HP PETROL') || desc.includes('RELIANCE BP')) return 'Fuel & Conveyance';

    // ── Travel ──
    if (desc.includes('IRCTC') || desc.includes('REDBUS') || desc.includes('RAILWAY') || desc.includes('IBIBOGROUP')) return 'Travelling Expenses';

    // ── Food ──
    if (desc.includes('ZOMATO') || desc.includes('SWIGGY') || desc.includes('DOMINOS') || desc.includes('FOOD') || desc.includes('HOTEL GREEN') || desc.includes('HOTEL JT') || desc.includes('ANAND KULFI')) return 'Food & Refreshment';

    // ── Amazon / Shopping (Office) ──
    if (desc.includes('AMAZON') || desc.includes('FLIPKART') || desc.includes('RELIANCE DIGITA')) return 'Office Supplies';

    // ── Medical ──
    if (desc.includes('MEDICAL') || desc.includes('PHARMA') || desc.includes('HOSPITAL') || desc.includes('AYURVED')) return 'Medical Expenses';

    // ── Rent ──
    if (desc.includes('SARODAY') || desc.includes('RAHANE')) return 'Rent';

    // ── Car/Vehicle ──
    if (desc.includes('CAR C') || desc.includes('VEHICLE')) return 'Repairs & Maintenance';

    // ── REMAINING: General payment → Miscellaneous Expenses ──
    return 'Miscellaneous Expenses';
  }

  // ── 6. Parse date string to Date object ──
  function parseDate(dateStr) {
    // "01 Apr 2024" → Date
    const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const parts = dateStr.split(' ');
    return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
  }

  // ── 7. Create payment vouchers ──
  let voucherNum = 1;
  let created = 0;
  let skipped = 0;
  const summary = {};

  for (const d of debits) {
    const ledgerName = categorize(d);
    if (!ledgerName) { skipped++; continue; } // Cash deposits

    const targetLedger = ledgerMap[ledgerName];
    if (!targetLedger) {
      console.error(`LEDGER NOT FOUND: "${ledgerName}" for txn ${d.sn} ${d.desc}`);
      skipped++;
      continue;
    }

    // Track summary
    if (!summary[ledgerName]) summary[ledgerName] = { count: 0, total: 0 };
    summary[ledgerName].count++;
    summary[ledgerName].total += d.amount;

    const vNum = `PAY-2425-${String(voucherNum).padStart(3, '0')}`;
    const dateObj = parseDate(d.date);

    // Double entry: Dr Expense/Asset, Cr Bank
    const voucher = {
      voucherNumber: vNum,
      type: 'PAYMENT',
      date: dateObj,
      financialYear: FY,
      entries: [
        {
          ledgerId: targetLedger._id,
          ledgerName: targetLedger.name,
          type: 'DEBIT',
          amount: d.amount,
        },
        {
          ledgerId: bankLedger._id,
          ledgerName: bankLedger.name,
          type: 'CREDIT',
          amount: d.amount,
        },
      ],
      totalDebit: d.amount,
      totalCredit: d.amount,
      narration: `${d.desc.substring(0, 100)} | Bank Ref: SN ${d.sn}`,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await voucherCol.insertOne(voucher);
    created++;
    voucherNum++;
  }

  // ── 8. Print Summary ──
  console.log(`\n══════════════════════════════════════════════════════`);
  console.log(`  PAYMENT VOUCHERS CREATED: ${created}`);
  console.log(`  Skipped (cash deposits): ${skipped}`);
  console.log(`══════════════════════════════════════════════════════`);

  let grandTotal = 0;
  Object.entries(summary)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([name, data]) => {
      console.log(`  ${name}: ${data.count} vouchers = ₹${data.total.toFixed(2)}`);
      grandTotal += data.total;
    });

  console.log(`\n  GRAND TOTAL: ₹${grandTotal.toFixed(2)}`);

  // Final voucher count
  const totalV = await voucherCol.countDocuments({ financialYear: FY });
  const totalL = await ledgerCol.countDocuments({ financialYear: FY });
  console.log(`\n  Total FY 2024-25: ${totalL} ledgers, ${totalV} vouchers`);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
