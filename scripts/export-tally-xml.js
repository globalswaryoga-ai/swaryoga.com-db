/**
 * Export MongoDB Tally data → Tally Prime XML (importable)
 *
 * Generates:
 *   1. Ledger Masters (all unique ledgers with parent groups)
 *   2. Vouchers (Receipts, Payments, Journals — all 146 vouchers)
 *
 * Output: ~/Downloads/tally-import-FY2023-24.xml
 *
 * To import in Tally Prime:
 *   Gateway of Tally → Import Data → XML (Other Software)
 *   Select the generated .xml file
 *
 * Company: UPAMNYU INTERNATIONAL EDUCATION PRIVATE LIMITED
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const FY = '2023-24';
const COMPANY_NAME = 'Upamnyu International Education Private Limited';
const OUTPUT_DIR = path.join(require('os').homedir(), 'Downloads');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `tally-import-FY${FY}.xml`);

// ── Tally Parent Groups (must match Tally's built-in group names) ────
const TALLY_GROUP_MAP = {
  // Category → Standard Tally Group
  'Bank Accounts':        'Bank Accounts',
  'Cash-in-Hand':         'Cash-in-Hand',
  'Fixed Assets':         'Fixed Assets',
  'Current Assets':       'Current Assets',
  'Sundry Debtors':       'Sundry Debtors',
  'Sundry Creditors':     'Sundry Creditors',
  'Capital Account':      'Capital Account',
  'Share Capital':        'Capital Account',
  'Unsecured Loans':      'Unsecured Loans',
  'Current Liabilities':  'Current Liabilities',
  'Non-Current Liabilities': 'Current Liabilities',
  'Reserves & Surplus':   'Reserves & Surplus',
  'Suspense A/c':         'Suspense A/c',
  'Direct Incomes':       'Direct Incomes',
  'Revenue from Operations': 'Direct Incomes',
  'Other Income':         'Indirect Incomes',
  'Indirect Incomes':     'Indirect Incomes',
  'Indirect Expenses':    'Indirect Expenses',
  'Admin Expenses':       'Indirect Expenses',
  'Depreciation':         'Indirect Expenses',
};

// ── Date helpers ─────────────────────────────────────────────────────
function toTallyDate(dateStr) {
  // Input: "2023-04-05" or "2024-03-30"  → Output: "20230405"
  if (!dateStr) return '20240331';
  return dateStr.replace(/-/g, '');
}

function escXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Build Ledger Master XML ──────────────────────────────────────────
function buildLedgerXml(ledgerName, parentGroup, openingBalance, drCr) {
  const tallyGroup = TALLY_GROUP_MAP[parentGroup] || parentGroup || 'Sundry Debtors';

  // Opening balance: Tally uses negative for Credit
  let openBal = 0;
  if (openingBalance && openingBalance > 0) {
    openBal = drCr === 'Cr' ? -openingBalance : openingBalance;
  }

  return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <LEDGER NAME="${escXml(ledgerName)}" ACTION="Create">
        <NAME.LIST>
          <NAME>${escXml(ledgerName)}</NAME>
        </NAME.LIST>
        <PARENT>${escXml(tallyGroup)}</PARENT>
        <ISBILLWISEON>No</ISBILLWISEON>
        <OPENINGBALANCE>${openBal.toFixed(2)}</OPENINGBALANCE>
      </LEDGER>
    </TALLYMESSAGE>`;
}

// ── Build Voucher XML ────────────────────────────────────────────────
function buildVoucherXml(voucher, contraLedger) {
  const date = toTallyDate(voucher.date);
  const vType = mapVoucherType(voucher.voucherType);
  const amount = voucher.amount || 0;

  // Tally vouchers need double-entry: Debit one ledger, Credit another
  let debitLedger, creditLedger, debitAmt, creditAmt;

  if (voucher.voucherType === 'Receipt') {
    // Receipt: Debit Bank/Cash, Credit Income/Party
    debitLedger = contraLedger;
    creditLedger = voucher.ledgerName;
    debitAmt = amount;
    creditAmt = -amount; // Tally uses negative for credit entries in voucher
  } else if (voucher.voucherType === 'Payment') {
    // Payment: Debit Expense/Party, Credit Bank/Cash
    debitLedger = voucher.ledgerName;
    creditLedger = contraLedger;
    debitAmt = amount;
    creditAmt = -amount;
  } else {
    // Journal: Debit the ledger, Credit Suspense/P&L
    debitLedger = voucher.ledgerName;
    creditLedger = contraLedger;
    debitAmt = amount;
    creditAmt = -amount;
  }

  const narration = escXml(voucher.narration || `${voucher.voucherType} - ${voucher.ledgerName}`);
  const vchNum = escXml(voucher.voucherNumber || '');

  return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="${escXml(vType)}" ACTION="Create" OBJVIEW="Accounting Voucher View">
        <DATE>${date}</DATE>
        <VOUCHERTYPENAME>${escXml(vType)}</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${vchNum}</VOUCHERNUMBER>
        <NARRATION>${narration}</NARRATION>
        <PARTYLEDGERNAME>${escXml(voucher.partyName || voucher.ledgerName)}</PARTYLEDGERNAME>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escXml(debitLedger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>${debitAmt.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escXml(creditLedger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${creditAmt.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </TALLYMESSAGE>`;
}

function mapVoucherType(type) {
  const map = {
    'Receipt': 'Receipt',
    'Payment': 'Payment',
    'Journal': 'Journal',
    'Sales': 'Sales',
    'Purchase': 'Purchase',
    'Contra': 'Contra',
  };
  return map[type] || 'Journal';
}

// ── Determine contra ledger for double-entry ─────────────────────────
function getContraLedger(voucher) {
  const type = voucher.voucherType;
  const isAdj = (voucher.voucherNumber || '').startsWith('ADJ-');

  if (type === 'Receipt' || type === 'Payment') {
    // Day Book entries: all go through Kotak bank per Excel data
    return 'Kotak Mahindra Bank A/C 0247296457';
  }

  if (isAdj) {
    // Adjustment Journal entries — use appropriate contra
    const ledger = (voucher.ledgerName || '').toLowerCase();

    // Depreciation — contra is the asset account (but simplified to P&L)
    if (ledger.includes('depreciation')) return 'Profit & Loss A/c';

    // Income adjustments → Bank/Cash
    if (ledger.includes('course fees') || ledger.includes('other income') || ledger.includes('income'))
      return 'Cash';

    // Expense adjustments → Bank/Cash
    if (ledger.includes('rent') || ledger.includes('expense') || ledger.includes('fees') ||
        ledger.includes('charges') || ledger.includes('travelling') || ledger.includes('stationery') ||
        ledger.includes('training') || ledger.includes('teacher') || ledger.includes('advertisement') ||
        ledger.includes('electricity') || ledger.includes('mobile') || ledger.includes('internet') ||
        ledger.includes('roc') || ledger.includes('tax paid') || ledger.includes('class expense'))
      return 'Cash';

    // Asset purchases (JBL, Mobile) → Cash / P&L
    if (ledger.includes('jbl') || ledger.includes('mobile') || ledger.includes('computer') ||
        ledger.includes('furniture') || ledger.includes('machinery') || ledger.includes('software'))
      return 'Profit & Loss A/c';

    // Liability adjustments
    if (ledger.includes('share capital') || ledger.includes('advance'))
      return 'Kotak Mahindra Bank A/C 0247296457';

    // Default
    return 'Suspense A/c';
  }

  return 'Suspense A/c';
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  EXPORT MongoDB → Tally Prime XML                           ║');
  console.log('║  Company: Upamnyu International Education Pvt. Ltd.         ║');
  console.log('║  FY: 2023-24                                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN not set');
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName: 'swaryoga_admin_crm' });
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;

  // ─── 1. Fetch all vouchers ────────────────────────────────────────
  const vouchers = await db.collection('tally_manual_vouchers')
    .find({ financialYear: FY })
    .sort({ date: 1 })
    .toArray();
  console.log(`📋 Vouchers: ${vouchers.length}`);

  // ─── 2. Fetch balance entries (for opening balances) ──────────────
  const balances = await db.collection('tally_manual_balances')
    .find({ financialYear: FY })
    .toArray();
  console.log(`📊 Balance entries: ${balances.length}`);

  // ─── 3. Collect all unique ledger names ───────────────────────────
  const ledgerMap = new Map(); // name → { parentGroup, openingBalance, drCr }

  // From balance entries (opening balances from excel-import, dated 01-04-2023)
  for (const bal of balances) {
    if (bal.asOnDate === '01-04-2023' || bal.createdBy === 'ca-report-import') {
      const existing = ledgerMap.get(bal.ledgerName);
      if (!existing || bal.createdBy === 'ca-report-import') {
        // CA report takes precedence for proper naming
        ledgerMap.set(bal.ledgerName, {
          parentGroup: bal.parentGroup || 'Sundry Debtors',
          openingBalance: bal.asOnDate === '01-04-2023' ? (bal.amount || 0) : 0,
          drCr: bal.drCr || 'Dr',
        });
      }
    }
  }

  // From vouchers (party names & ledger names)
  for (const v of vouchers) {
    if (!ledgerMap.has(v.ledgerName)) {
      ledgerMap.set(v.ledgerName, {
        parentGroup: guessParentGroup(v),
        openingBalance: 0,
        drCr: 'Dr',
      });
    }
    // Also ensure contra ledger exists
    const contra = getContraLedger(v);
    if (!ledgerMap.has(contra)) {
      ledgerMap.set(contra, {
        parentGroup: guessParentGroupByName(contra),
        openingBalance: 0,
        drCr: 'Dr',
      });
    }
  }

  // Ensure standard ledgers exist
  const standardLedgers = [
    { name: 'Cash', group: 'Cash-in-Hand' },
    { name: 'Kotak Mahindra Bank A/C 0247296457', group: 'Bank Accounts' },
    { name: 'Profit & Loss A/c', group: 'Primary' },
    { name: 'Suspense A/c', group: 'Suspense A/c' },
  ];
  for (const sl of standardLedgers) {
    if (!ledgerMap.has(sl.name)) {
      ledgerMap.set(sl.name, { parentGroup: sl.group, openingBalance: 0, drCr: 'Dr' });
    }
  }

  console.log(`📌 Unique ledgers: ${ledgerMap.size}`);

  // ─── 4. Build XML ────────────────────────────────────────────────
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters and Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escXml(COMPANY_NAME)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>`;

  // ── 4a. Ledger Masters ────────────────────────────────────────────
  console.log('\n── Generating Ledger Masters ──');
  let ledgerCount = 0;
  for (const [name, info] of ledgerMap) {
    // Skip Tally built-in ledgers
    if (name === 'Profit & Loss A/c') continue; // Built-in

    xml += buildLedgerXml(name, info.parentGroup, info.openingBalance, info.drCr);
    ledgerCount++;
  }
  console.log(`  ✅ ${ledgerCount} ledger masters`);

  // ── 4b. Vouchers ──────────────────────────────────────────────────
  console.log('\n── Generating Vouchers ──');
  let vchCount = 0;
  const vchByType = { Receipt: 0, Payment: 0, Journal: 0 };

  for (const v of vouchers) {
    const contra = getContraLedger(v);
    xml += buildVoucherXml(v, contra);
    vchCount++;
    vchByType[v.voucherType] = (vchByType[v.voucherType] || 0) + 1;
  }
  console.log(`  ✅ ${vchCount} vouchers (Receipt: ${vchByType.Receipt || 0}, Payment: ${vchByType.Payment || 0}, Journal: ${vchByType.Journal || 0})`);

  // ── Close XML envelope ────────────────────────────────────────────
  xml += `
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  // ─── 5. Write file ────────────────────────────────────────────────
  fs.writeFileSync(OUTPUT_FILE, xml, 'utf8');
  const sizeKB = (Buffer.byteLength(xml, 'utf8') / 1024).toFixed(1);

  console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║  EXPORT COMPLETE                                             ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  File: ${OUTPUT_FILE.padEnd(54)}║`);
  console.log(`║  Size: ${(sizeKB + ' KB').padEnd(54)}║`);
  console.log(`║  Ledger Masters: ${String(ledgerCount).padEnd(44)}║`);
  console.log(`║  Vouchers:       ${String(vchCount).padEnd(44)}║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  HOW TO IMPORT IN TALLY PRIME:                               ║`);
  console.log(`║  1. Open Tally Prime → Select / Create Company               ║`);
  console.log(`║  2. Gateway of Tally → Import Data                           ║`);
  console.log(`║  3. Select the XML file from Downloads folder                ║`);
  console.log(`║  4. Tally will create ledgers + vouchers automatically       ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);

  await mongoose.disconnect();
}

// ── Helper: guess parent group from voucher ─────────────────────────
function guessParentGroup(voucher) {
  const n = (voucher.ledgerName || '').toUpperCase();
  return guessParentGroupByName(n);
}

function guessParentGroupByName(name) {
  const n = name.toUpperCase();

  if (n.includes('BANK') || n.includes('KOTAK')) return 'Bank Accounts';
  if (n === 'CASH') return 'Cash-in-Hand';
  if (n.includes('COMPUTER') || n.includes('FURNITURE') || n.includes('MACHINERY') ||
      n.includes('TALLY SOFTWARE') || n.includes('JBL') || n.includes('MOBILE')) return 'Fixed Assets';
  if (n.includes('SWAR YOGA') || n.includes('BANDHAN MUKTI') || n.includes('COURSE FEES')) return 'Direct Incomes';
  if (n.includes('RENT') || n.includes('EXPENSE') || n.includes('FEES') || n.includes('CHARGES') ||
      n.includes('TRAVELLING') || n.includes('ELECTRICITY') || n.includes('ADVERTISING') ||
      n.includes('STATIONERY') || n.includes('TRAINING') || n.includes('TEACHER') ||
      n.includes('DEPRECIATION') || n.includes('ROC') || n.includes('TAX') ||
      n.includes('CLASS EXP') || n.includes('SHREE DATTA')) return 'Indirect Expenses';
  if (n.includes('OTHER INCOME')) return 'Indirect Incomes';
  if (n.includes('PROFIT & LOSS') || n.includes('PROFIT AND LOSS')) return 'Primary';
  if (n.includes('SUSPENSE')) return 'Suspense A/c';
  if (n === 'MOHAN KALBURGI') return 'Unsecured Loans';
  if (n.includes('MOHAN PANDURANG') || n.includes('UPAMNYU MOHAN') || n.includes('SHARE CAPITAL')) return 'Capital Account';
  if (n.includes('AUDIT FEES PAYABLE') || n.includes('CONSULTING FEES') || n.includes('ADVANCE')) return 'Current Liabilities';
  if (n.includes('DEFERRED TAX')) return 'Current Liabilities';
  if (n.includes('RECEIVABLE')) return 'Sundry Debtors';

  // Person names → likely creditors/debtors
  return 'Sundry Debtors';
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
