/**
 * Import Tally Excel Data → MongoDB (tally_manual_vouchers + tally_manual_balances)
 * Source: "all data.xlsx" — Tally Day Book + Ledger Vouchers
 * Company: Upamnyu International Education Pvt. Ltd.
 * Period: 1-Apr-23 to 20-Oct-23 (FY 2023-24)
 *
 * STRATEGY:
 *   1. Import ALL Day Book vouchers (Apr-Oct 2023) as-is
 *   2. Import opening balances (as of 1-Apr-2023) from Ledger sheet
 *   3. Compare Excel closing balances (20-Oct-23) with CA audited balances (31-Mar-24)
 *   4. Create ADJUSTMENT VOUCHERS dated 30-Mar-2024 for the gap (Oct 23 → Mar 24)
 *   5. CA report data (createdBy: 'ca-report-import') is NEVER touched
 *
 * NOTE: This does NOT touch the accounting page data. Tally = organization books.
 */

const XLSX = require('xlsx');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const FY = '2023-24';
const EXCEL_PATH = '/Users/mohankalburgi/Downloads/all data.xlsx';

// ── CA Report ledger name → Excel ledger name mapping ───────────────
// The CA report uses slightly different names than Tally export
const CA_TO_EXCEL_MAP = {
  // CA Report Name                 → Excel Ledger Name
  'Cash in Hand':                    'Cash',
  'Kotak Mahindra Bank A/C':         'KOTAK MAHINDRA BANK A/C 0247296457',
  'Computer':                        'Computers',
  'Furniture and Fixture':           'Furniture & Fixtures',
  'Software':                        'Tally Software',
  'Machinery & Equipment':           'Machinery & Equipments',
  'Audit Fees Payable':              'AUDIT FEES PAYABLE',
  'Profit & Loss Account':           'Profit & Loss A/c',
  'Office Rent':                     'RENT',
  'Advertisement Expenses':          'ADERTISING EXPENSES',
  'Professional Fees':               'PROFESSIONAL FEES',
  'Bank Charges':                    'BANK CHARGES',
  'Electricity Expenses':            'ELECTRICITY EXPENSES',
  'Travelling Expenses':             'TRAELLING EXPENSES',
  'ROC Fees':                        'ROC FEES',
  'Course Fees':                     null, // aggregated from multiple income ledgers
  'Internet & Mobile Expenses':      'MOBILE EXPENSES',
  'Class Expenses':                  'RAIPUR CLASS EXP',
};

// ── Excel date serial → YYYY-MM-DD ─────────────────────────────────
function excelDate(serial) {
  if (typeof serial === 'string') return serial;
  const d = new Date((serial - 25569) * 86400 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── Parse Day Book → vouchers array ─────────────────────────────────
function parseDayBook(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const vouchers = [];

  for (let i = 7; i < rows.length; i++) {
    const [dateSerial, particulars, vchType, vchNo, debit, credit] = rows[i];

    if (!dateSerial || typeof dateSerial !== 'number') continue;
    if (!vchType || !particulars) continue;

    const date = excelDate(dateSerial);
    const amount = parseFloat(debit) || parseFloat(credit) || 0;
    if (amount === 0) continue;

    const isReceipt = vchType === 'Receipt';
    const isPayment = vchType === 'Payment';
    if (!isReceipt && !isPayment) continue;

    vouchers.push({
      voucherType: isReceipt ? 'Receipt' : 'Payment',
      voucherNumber: vchNo ? String(vchNo) : '',
      date,
      partyName: String(particulars).trim(),
      ledgerName: String(particulars).trim(),
      amount,
      narration: `${vchType} - ${particulars}` + (vchNo ? ` (Vch #${vchNo})` : ''),
      paymentMode: 'Bank',
      financialYear: FY,
      createdBy: 'excel-import',
    });
  }

  return vouchers;
}

// ── Parse Ledger Vouchers → opening & closing balances ──────────────
function parseLedgerVouchers(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const ledgers = [];

  let currentLedger = null;
  let openingBalance = null;
  let closingBalance = null;
  let openingDrCr = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (row[0] === 'Ledger:') {
      if (currentLedger && closingBalance !== null) {
        ledgers.push({ ledgerName: currentLedger, openingBalance: openingBalance || 0, openingDrCr: openingDrCr || 'Dr', closingBalance });
      }
      currentLedger = String(row[1]).trim();
      openingBalance = null;
      closingBalance = null;
      openingDrCr = null;
      continue;
    }

    if (row[1] === 'To' && row[2] === 'Opening Balance') {
      openingBalance = parseFloat(row[5]) || 0;
      openingDrCr = 'Dr';
    } else if (row[1] === 'By' && row[2] === 'Opening Balance') {
      openingBalance = parseFloat(row[6]) || 0;
      openingDrCr = 'Cr';
    }

    if (row[1] === 'To' && row[2] === 'Closing Balance') {
      closingBalance = parseFloat(row[3]) || 0;
    } else if (row[1] === 'By' && row[2] === 'Closing Balance') {
      closingBalance = parseFloat(row[6]) || 0;
    }
  }

  if (currentLedger && closingBalance !== null) {
    ledgers.push({ ledgerName: currentLedger, openingBalance: openingBalance || 0, openingDrCr: openingDrCr || 'Dr', closingBalance });
  }

  return ledgers;
}

// ── Classify ledger → parent group + category ──────────────────────
function classifyLedger(name) {
  const n = name.toUpperCase();

  // INCOME
  if (n.includes('SWAR YOGA') || n.includes('BANDHAN MUKTI')) return { parentGroup: 'Direct Incomes', category: 'income' };

  // EXPENSE
  if (n.includes('RENT')) return { parentGroup: 'Indirect Expenses', category: 'expense' };
  if (n.includes('ADER') || n.includes('ADVERTISING')) return { parentGroup: 'Indirect Expenses', category: 'expense' };
  if (n.includes('PROFESSIONAL FEES')) return { parentGroup: 'Indirect Expenses', category: 'expense' };
  if (n.includes('BANK CHARGES')) return { parentGroup: 'Indirect Expenses', category: 'expense' };
  if (n.includes('MOBILE EXPENSES')) return { parentGroup: 'Indirect Expenses', category: 'expense' };
  if (n.includes('ELECTRICITY')) return { parentGroup: 'Indirect Expenses', category: 'expense' };
  if (n.includes('TRAELLING') || n.includes('TRAVELLING')) return { parentGroup: 'Indirect Expenses', category: 'expense' };
  if (n.includes('ROC FEES')) return { parentGroup: 'Indirect Expenses', category: 'expense' };
  if (n.includes('RAIPUR CLASS EXP')) return { parentGroup: 'Indirect Expenses', category: 'expense' };
  if (n.includes('SHREE DATTA')) return { parentGroup: 'Indirect Expenses', category: 'expense' };

  // ASSET
  if (n.includes('KOTAK MAHINDRA') || n.includes('BANK A/C')) return { parentGroup: 'Bank Accounts', category: 'asset' };
  if (n === 'CASH') return { parentGroup: 'Cash-in-Hand', category: 'asset' };
  if (n.includes('COMPUTER')) return { parentGroup: 'Fixed Assets', category: 'asset' };
  if (n.includes('FURNITURE')) return { parentGroup: 'Fixed Assets', category: 'asset' };
  if (n.includes('MACHINERY') || n.includes('EQUIPMENT')) return { parentGroup: 'Fixed Assets', category: 'asset' };
  if (n.includes('TALLY SOFTWARE')) return { parentGroup: 'Fixed Assets', category: 'asset' };
  if (n.includes('SUSPENSE')) return { parentGroup: 'Suspense A/c', category: 'asset' };
  if (n.includes('NAGESH DANTKALE')) return { parentGroup: 'Sundry Debtors', category: 'asset' };

  // LIABILITY / Capital
  if (n === 'MOHAN KALBURGI') return { parentGroup: 'Unsecured Loans', category: 'liability' };
  if (n === 'MOHAN PANDURANG KALBURGI') return { parentGroup: 'Capital Account', category: 'liability' };
  if (n === 'UPAMNYU MOHAN KALBURGI') return { parentGroup: 'Capital Account', category: 'liability' };
  if (n.includes('PROFIT & LOSS') || n.includes('PROFIT AND LOSS')) return { parentGroup: 'Reserves & Surplus', category: 'liability' };
  if (n.includes('AUDIT FEES')) return { parentGroup: 'Current Liabilities', category: 'liability' };

  // Sundry Creditors (investors / loan accounts)
  const creditors = ['SONU GUPTA', 'VISHAL AGRAWAL', 'MAHESH AGRAWAL', 'SANTOSH AGRAWAL',
    'ARATI AKULA', 'SWATI SAWANT', 'VAISHALI PATHAK', 'JANAVI SURYAWANSHI',
    'BONISONS EQUIPMENT', 'MAHI SANTANI'];
  for (const sc of creditors) {
    if (n.includes(sc)) return { parentGroup: 'Sundry Creditors', category: 'liability' };
  }

  return { parentGroup: 'Sundry Debtors', category: 'asset' };
}

// ── CA Report final audited balances (from import-ca-balances.js) ───
// These are the CORRECT final figures as of 31-Mar-2024 per statutory audit.
// We compare Excel closing (20-Oct-23) with these to generate adjustments.
const H = 100; // CA figures are in "Rs. In Hundred" * 100
const CA_BALANCES = {
  // Balance Sheet items
  'Equity Share Capital':        { amount: 1000.00 * H, drCr: 'Cr', cat: 'liability', group: 'Share Capital' },
  'Preference Share Capital':    { amount: 5100.00 * H, drCr: 'Cr', cat: 'liability', group: 'Share Capital' },
  'Profit & Loss Account':      { amount: 451.92 * H,  drCr: 'Dr', cat: 'liability', group: 'Reserves & Surplus' },
  'Deferred Tax Liability':      { amount: 304.93 * H,  drCr: 'Dr', cat: 'liability', group: 'Non-Current Liabilities' },
  'Audit Fees Payable':          { amount: 50.00 * H,   drCr: 'Cr', cat: 'liability', group: 'Current Liabilities' },
  'Consulting Fees Payable':     { amount: 25.00 * H,   drCr: 'Cr', cat: 'liability', group: 'Current Liabilities' },
  'Sundry Advances (Received)':  { amount: 3250.00 * H, drCr: 'Cr', cat: 'liability', group: 'Current Liabilities' },
  'Computer':                    { amount: 2424.83 * H, drCr: 'Dr', cat: 'asset',     group: 'Fixed Assets' },
  'Furniture and Fixture':       { amount: 312.02 * H,  drCr: 'Dr', cat: 'asset',     group: 'Fixed Assets' },
  'Software (Tally)':            { amount: 66.31 * H,   drCr: 'Dr', cat: 'asset',     group: 'Fixed Assets' },
  'Machinery & Equipment':       { amount: 307.57 * H,  drCr: 'Dr', cat: 'asset',     group: 'Fixed Assets' },
  'JBL Speaker':                 { amount: 258.47 * H,  drCr: 'Dr', cat: 'asset',     group: 'Fixed Assets' },
  'Mobile':                      { amount: 607.99 * H,  drCr: 'Dr', cat: 'asset',     group: 'Fixed Assets' },
  'Cash in Hand':                { amount: 2918.86 * H, drCr: 'Dr', cat: 'asset',     group: 'Cash-in-Hand' },
  'Kotak Mahindra Bank':         { amount: 374.41 * H,  drCr: 'Dr', cat: 'asset',     group: 'Bank Accounts' },
  'Fees Receivable':             { amount: 1117.69 * H, drCr: 'Dr', cat: 'asset',     group: 'Current Assets' },
  'Sundry Advances (Paid)':      { amount: 280.00 * H,  drCr: 'Dr', cat: 'asset',     group: 'Current Assets' },

  // P&L items
  'Course Fees (Income)':        { amount: 7035.70 * H, drCr: 'Cr', cat: 'income',    group: 'Revenue from Operations' },
  'Other Income':                { amount: 201.52 * H,  drCr: 'Cr', cat: 'income',    group: 'Other Income' },
  'Depreciation':                { amount: 2813.81 * H, drCr: 'Dr', cat: 'expense',   group: 'Depreciation' },
  'Bank Charges':                { amount: 0.41 * H,    drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Office Rent':                 { amount: 525.00 * H,  drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Advertisement Expenses':      { amount: 259.00 * H,  drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Electricity Expenses':        { amount: 88.05 * H,   drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Office Expenses':             { amount: 281.22 * H,  drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Class Expenses':              { amount: 711.80 * H,  drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Training Expenses':           { amount: 86.60 * H,   drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Internet & Mobile Expenses':  { amount: 267.98 * H,  drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Printing & Stationery':       { amount: 176.50 * H,  drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Professional Fees':           { amount: 363.00 * H,  drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'ROC Fees':                    { amount: 1.00 * H,    drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'SA Tax Paid':                 { amount: 11.80 * H,   drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Travelling Expenses':         { amount: 700.80 * H,  drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
  'Teachers Fees':               { amount: 1744.81 * H, drCr: 'Dr', cat: 'expense',   group: 'Admin Expenses' },
};

// ── Map Excel ledger → CA ledger for comparison ─────────────────────
const EXCEL_TO_CA = {
  'Cash':                                    'Cash in Hand',
  'KOTAK MAHINDRA BANK A/C 0247296457':      'Kotak Mahindra Bank',
  'Computers':                               'Computer',
  'Furniture & Fixtures':                    'Furniture and Fixture',
  'Tally Software':                          'Software (Tally)',
  'Machinery & Equipments':                  'Machinery & Equipment',
  'AUDIT FEES PAYABLE':                      'Audit Fees Payable',
  'Profit & Loss A/c':                       'Profit & Loss Account',
  'RENT':                                    'Office Rent',
  'ADERTISING EXPENSES':                     'Advertisement Expenses',
  'PROFESSIONAL FEES':                       'Professional Fees',
  'BANK CHARGES':                            'Bank Charges',
  'MOBILE EXPENSES':                         'Internet & Mobile Expenses',
  'ELECTRICITY EXPENSES':                    'Electricity Expenses',
  'TRAELLING EXPENSES':                      'Travelling Expenses',
  'ROC FEES':                                'ROC Fees',
  'RAIPUR CLASS EXP':                        'Class Expenses',
  // Income ledgers → aggregated in CA as "Course Fees"
  'SWAR YOGA LEVEL-1':                       'Course Fees (Income)',
  'SWAR YOGA LEVEL-3':                       'Course Fees (Income)',
  'SWAR YOGA LEVEL-1 ONLINE RAIPUR':         'Course Fees (Income)',
  'BANDHAN MUKTI PROGRAM':                   'Course Fees (Income)',
  // Person accounts (investors/loans) → aggregated in CA as "Sundry Advances (Received)"
  'MOHAN KALBURGI':                          null, // Director loan — separate
  'SONU GUPTA':                              'Sundry Advances (Received)',
  'Vishal Agrawal Raipur':                   'Sundry Advances (Received)',
  'MAHESH AGRAWAL':                          'Sundry Advances (Received)',
  'SANTOSH AGRAWAL':                         'Sundry Advances (Received)',
  'ARATI AKULA':                             'Sundry Advances (Received)',
  'SWATI SAWANT':                            'Sundry Advances (Received)',
  'VAISHALI PATHAK':                         'Sundry Advances (Received)',
  'JANAVI SURYAWANSHI':                      'Sundry Advances (Received)',
  'Bonisons Equipment PVT LTD':              'Sundry Advances (Received)',
  'MAHI SANTANI':                            'Sundry Advances (Received)',
  'MOHAN PANDURANG KALBURGI':                null, // Capital
  'UPAMNYU MOHAN KALBURGI':                  null, // Capital
  'Suspense A/c':                            null, // Will clear
  'Nagesh Dantkale':                         null, // Small debtor
  'SHREE DATTA':                             null, // Small expense
};

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  TALLY EXCEL DATA IMPORT → MongoDB                          ║');
  console.log('║  Company: Upamnyu International Education Pvt. Ltd.         ║');
  console.log('║  Period : 1-Apr-23 to 20-Oct-23 + Adj to 31-Mar-24         ║');
  console.log('║  CA Report balances (ca-report-import) are NOT touched      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Read Excel
  const wb = XLSX.readFile(EXCEL_PATH);
  console.log('\n📊 Sheets found:', wb.SheetNames.join(', '));

  // ─── 1. Parse Day Book vouchers ───────────────────────────────────
  const vouchers = parseDayBook(wb.Sheets['Day Book']);
  const receipts = vouchers.filter(v => v.voucherType === 'Receipt');
  const payments = vouchers.filter(v => v.voucherType === 'Payment');
  console.log(`\n📋 Day Book → ${vouchers.length} vouchers`);
  console.log(`   Receipts: ${receipts.length} (₹${receipts.reduce((s, v) => s + v.amount, 0).toLocaleString('en-IN')})`);
  console.log(`   Payments: ${payments.length} (₹${payments.reduce((s, v) => s + v.amount, 0).toLocaleString('en-IN')})`);

  // ─── 2. Parse Ledger opening/closing balances ─────────────────────
  const ledgers = parseLedgerVouchers(wb.Sheets['Ledger Vouchers']);
  console.log(`\n📊 Ledger Vouchers → ${ledgers.length} ledgers`);

  // Build opening balance entries
  const balanceEntries = [];
  for (const lg of ledgers) {
    const cls = classifyLedger(lg.ledgerName);
    if (lg.openingBalance > 0) {
      balanceEntries.push({
        ledgerName: lg.ledgerName,
        parentGroup: cls.parentGroup,
        category: cls.category,
        amount: lg.openingBalance,
        drCr: lg.openingDrCr,
        financialYear: FY,
        asOnDate: '01-04-2023',
        notes: `Opening balance from Tally export (1-Apr-23)`,
        createdBy: 'excel-import',
      });
    }
  }

  // ─── 3. Compare Excel closing (20-Oct-23) vs CA balances (31-Mar-24) ──
  console.log('\n── COMPARISON: Excel Closing (20-Oct-23) vs CA Audit (31-Mar-24) ──');
  console.log('──────────────────────────────────────────────────────────────────');

  // Group Excel income ledgers by CA mapping for comparison
  const excelByCa = {};
  for (const lg of ledgers) {
    const caName = EXCEL_TO_CA[lg.ledgerName];
    if (!caName) continue;
    if (!excelByCa[caName]) excelByCa[caName] = 0;
    excelByCa[caName] += lg.closingBalance;
  }

  const adjustmentVouchers = [];
  let adjNum = 100; // Adjustment voucher numbering starts at 100

  for (const [caName, ca] of Object.entries(CA_BALANCES)) {
    const excelClosing = excelByCa[caName] || 0;
    const caAmount = ca.amount;
    const diff = caAmount - excelClosing;

    if (Math.abs(diff) < 1) {
      console.log(`  ✅ ${caName.padEnd(35)} Excel: ₹${excelClosing.toLocaleString('en-IN').padStart(12)} → CA: ₹${caAmount.toLocaleString('en-IN').padStart(12)}  (MATCH)`);
      continue;
    }

    console.log(`  🔄 ${caName.padEnd(35)} Excel: ₹${excelClosing.toLocaleString('en-IN').padStart(12)} → CA: ₹${caAmount.toLocaleString('en-IN').padStart(12)}  Δ ₹${diff.toLocaleString('en-IN').padStart(10)}`);

    // Create adjustment voucher dated 30-Mar-2024
    adjNum++;
    const isExpenseOrAsset = ca.cat === 'expense' || ca.cat === 'asset';
    let vchType = 'Journal';

    if (ca.cat === 'income' && diff > 0) {
      vchType = 'Receipt'; // more income came in
    } else if (ca.cat === 'expense' && diff > 0) {
      vchType = 'Payment'; // more expenses incurred
    } else if (ca.cat === 'asset') {
      // Asset changes could be depreciation (reduction) or purchase (increase)
      vchType = diff > 0 ? 'Journal' : 'Journal';
    }

    adjustmentVouchers.push({
      voucherType: vchType,
      voucherNumber: `ADJ-${adjNum}`,
      date: '2024-03-30',
      partyName: caName,
      ledgerName: caName,
      amount: Math.abs(diff),
      narration: `Adjustment entry: Excel closing ₹${excelClosing.toLocaleString('en-IN')} → CA audited ₹${caAmount.toLocaleString('en-IN')} | Gap ₹${diff.toLocaleString('en-IN')} for period Oct-23 to Mar-24`,
      paymentMode: isExpenseOrAsset ? 'Bank' : 'Journal',
      financialYear: FY,
      createdBy: 'excel-import',
    });
  }

  // Also add entries for CA items that have NO Excel counterpart (new items)
  const caOnly = [
    'Equity Share Capital', 'Preference Share Capital', 'Consulting Fees Payable',
    'JBL Speaker', 'Mobile', 'Fees Receivable', 'Sundry Advances (Paid)',
    'Other Income', 'Depreciation', 'Office Expenses', 'Training Expenses',
    'Printing & Stationery', 'SA Tax Paid', 'Teachers Fees', 'Deferred Tax Liability',
  ];
  for (const name of caOnly) {
    if (!CA_BALANCES[name]) continue;
    if (excelByCa[name]) continue; // already handled above
    const ca = CA_BALANCES[name];
    adjNum++;
    console.log(`  ➕ ${name.padEnd(35)} (CA-only)  ₹${ca.amount.toLocaleString('en-IN').padStart(12)} ${ca.drCr}`);
    adjustmentVouchers.push({
      voucherType: 'Journal',
      voucherNumber: `ADJ-${adjNum}`,
      date: '2024-03-30',
      partyName: name,
      ledgerName: name,
      amount: ca.amount,
      narration: `CA report entry (no Excel equivalent): ${name} — ₹${ca.amount.toLocaleString('en-IN')} ${ca.drCr}`,
      paymentMode: 'Journal',
      financialYear: FY,
      createdBy: 'excel-import',
    });
  }

  console.log(`\n📝 Generated ${adjustmentVouchers.length} adjustment vouchers (dated 30-Mar-2024)`);

  // ─── 4. Connect to MongoDB and import ─────────────────────────────
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN not set in .env.local');
    process.exit(1);
  }
  await mongoose.connect(uri, { dbName: 'swaryoga_admin_crm' });
  console.log('\n✅ Connected to MongoDB (swaryoga_admin_crm)');

  const db = mongoose.connection.db;

  // Clear old excel-import data ONLY (preserve ca-report-import)
  const oldVch = await db.collection('tally_manual_vouchers').countDocuments({ financialYear: FY, createdBy: 'excel-import' });
  const oldBal = await db.collection('tally_manual_balances').countDocuments({ financialYear: FY, createdBy: 'excel-import' });

  if (oldVch > 0 || oldBal > 0) {
    console.log(`\n⚠️  Clearing old excel-import: ${oldVch} vouchers, ${oldBal} balances`);
    await db.collection('tally_manual_vouchers').deleteMany({ financialYear: FY, createdBy: 'excel-import' });
    await db.collection('tally_manual_balances').deleteMany({ financialYear: FY, createdBy: 'excel-import' });
  }

  // Verify CA report data is untouched
  const caCount = await db.collection('tally_manual_balances').countDocuments({ financialYear: FY, createdBy: 'ca-report-import' });
  console.log(`\n🔒 CA report entries: ${caCount} (UNTOUCHED)`);

  // Insert Day Book vouchers
  const allVouchers = [...vouchers, ...adjustmentVouchers];
  if (allVouchers.length > 0) {
    const r1 = await db.collection('tally_manual_vouchers').insertMany(allVouchers);
    console.log(`✅ Inserted ${r1.insertedCount} vouchers (${vouchers.length} original + ${adjustmentVouchers.length} adjustments)`);
  }

  // Insert opening balance entries
  if (balanceEntries.length > 0) {
    const r2 = await db.collection('tally_manual_balances').insertMany(balanceEntries);
    console.log(`✅ Inserted ${r2.insertedCount} opening balance entries`);
  }

  // ─── 5. Verification summary ─────────────────────────────────────
  const totalVch = await db.collection('tally_manual_vouchers').countDocuments({ financialYear: FY });
  const totalBal = await db.collection('tally_manual_balances').countDocuments({ financialYear: FY });
  const caReport = await db.collection('tally_manual_balances').countDocuments({ financialYear: FY, createdBy: 'ca-report-import' });
  const excelBal = await db.collection('tally_manual_balances').countDocuments({ financialYear: FY, createdBy: 'excel-import' });

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  IMPORT COMPLETE — FY 2023-24                                ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  Day Book vouchers:      ${String(vouchers.length).padEnd(38)}║`);
  console.log(`║  Adjustment vouchers:    ${String(adjustmentVouchers.length).padEnd(38)}║`);
  console.log(`║  Total vouchers:         ${String(totalVch).padEnd(38)}║`);
  console.log(`║  Opening balances:       ${String(balanceEntries.length).padEnd(38)}║`);
  console.log(`║  CA report balances:     ${String(caReport).padEnd(22)} (untouched)      ║`);
  console.log(`║  Excel balances:         ${String(excelBal).padEnd(38)}║`);
  console.log(`║  Total balance entries:  ${String(totalBal).padEnd(38)}║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Show date range of vouchers
  const dateRange = await db.collection('tally_manual_vouchers').aggregate([
    { $match: { financialYear: FY } },
    { $group: { _id: null, minDate: { $min: '$date' }, maxDate: { $max: '$date' } } },
  ]).toArray();
  if (dateRange[0]) {
    console.log(`\n📅 Voucher date range: ${dateRange[0].minDate} → ${dateRange[0].maxDate}`);
  }

  await mongoose.disconnect();
  console.log('🔒 Done.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
