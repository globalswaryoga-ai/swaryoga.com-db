/**
 * Tally XML Export API — Generate Tally Prime 3.0.1 compatible XML
 *
 * GET  ?fy=2023-24&type=all        — full export (ledgers + vouchers)
 * GET  ?fy=2023-24&type=ledgers    — only ledger masters with opening balances
 * GET  ?fy=2023-24&type=vouchers   — only vouchers
 *
 * Returns downloadable XML file that can be imported in Tally Prime via:
 *   Gateway of Tally → Import Data → XML
 * Or via Tally HTTP API POST to port 9000
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getTallyManualBalance, getTallyManualVoucher } from '@/lib/schemas/enterpriseSchemas';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Map our category+parentGroup to Tally's standard group hierarchy
const GROUP_MAP: Record<string, string> = {
  // Assets
  'Bank Accounts': 'Bank Accounts',
  'Cash-in-Hand': 'Cash-in-Hand',
  'Fixed Assets': 'Fixed Assets',
  'Investments': 'Investments',
  'Deposits (Asset)': 'Deposits (Asset)',
  'Loans & Advances (Asset)': 'Loans & Advances (Asset)',
  'Stock-in-Hand': 'Stock-in-Hand',
  'Sundry Debtors': 'Sundry Debtors',
  // Liabilities
  'Capital Account': 'Capital Account',
  'Reserves & Surplus': 'Reserves & Surplus',
  'Secured Loans': 'Secured Loans',
  'Unsecured Loans': 'Unsecured Loans',
  'Current Liabilities': 'Current Liabilities',
  'Duties & Taxes': 'Duties & Taxes',
  'Provisions': 'Provisions',
  'Sundry Creditors': 'Sundry Creditors',
  // Income
  'Direct Incomes': 'Direct Incomes',
  'Indirect Incomes': 'Indirect Incomes',
  'Sales Accounts': 'Sales Accounts',
  // Expenses
  'Direct Expenses': 'Direct Expenses',
  'Indirect Expenses': 'Indirect Expenses',
  'Purchase Accounts': 'Purchase Accounts',
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Convert FY string to Tally date format: "2023-24" → "20230401" (from) and "20240331" (to)
function fyToDates(fy: string): { from: string; to: string; fromDisplay: string; toDisplay: string } {
  const [startYear] = fy.split('-');
  const endYear = `20${fy.split('-')[1]}`;
  return {
    from: `${startYear}0401`,
    to: `${endYear}0331`,
    fromDisplay: `1-Apr-${startYear}`,
    toDisplay: `31-Mar-${endYear}`,
  };
}

// Convert date string (YYYY-MM-DD or DD/MM/YYYY) to Tally format (YYYYMMDD)
function toTallyDate(dateStr: string): string {
  if (!dateStr) return '';
  // Already in YYYYMMDD format
  if (/^\d{8}$/.test(dateStr)) return dateStr;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr.replace(/-/g, '');
  // DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) return `${parts[2]}${parts[1]}${parts[0]}`;
  return dateStr.replace(/[^0-9]/g, '').slice(0, 8);
}

/**
 * Generate Tally XML for Ledger Masters with Opening Balances
 */
function generateLedgerXml(entries: any[], companyName: string): string {
  let messages = '';

  for (const entry of entries) {
    const tallyGroup = GROUP_MAP[entry.parentGroup] || entry.parentGroup;
    // In Tally: positive = Debit, negative = Credit
    const rawAmount = Number(entry.amount) || 0;  // NaN-safe
    const amount = entry.drCr === 'Cr' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
    const amountStr = amount !== 0 ? amount.toFixed(2) : '';

    messages += `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <LEDGER NAME="${escapeXml(entry.ledgerName)}" ACTION="Create">
        <NAME>${escapeXml(entry.ledgerName)}</NAME>
        <PARENT>${escapeXml(tallyGroup)}</PARENT>
        <ISBILLWISEON>No</ISBILLWISEON>
        <ISCOSTCENTRESON>No</ISCOSTCENTRESON>
        <ISREVENUE>No</ISREVENUE>${amountStr ? `
        <OPENINGBALANCE>${amountStr}</OPENINGBALANCE>` : ''}
      </LEDGER>
    </TALLYMESSAGE>`;
  }

  return messages;
}

/**
 * Generate Tally XML for Vouchers (Receipts, Payments, Sales, Purchases, Journal, Contra)
 */
function generateVoucherXml(vouchers: any[], companyName: string): string {
  let messages = '';

  // Tally voucher type mapping
  const typeMap: Record<string, string> = {
    'Receipt': 'Receipt',
    'Payment': 'Payment',
    'Sales': 'Sales',
    'Purchase': 'Purchase',
    'Journal': 'Journal',
    'Contra': 'Contra',
  };

  for (const v of vouchers) {
    const tallyType = typeMap[v.voucherType] || v.voucherType;
    const date = toTallyDate(v.date);
    if (!date) continue;

    const amount = Math.abs(v.amount || 0);
    if (amount === 0) continue;

    const partyName = escapeXml(v.partyName || 'Cash');
    const ledgerName = escapeXml(v.ledgerName || v.partyName || 'Cash');
    const narration = escapeXml(v.narration || '');
    const voucherNumber = escapeXml(v.voucherNumber || '');

    // Determine credit/debit ledgers based on voucher type
    let debitLedger: string;
    let creditLedger: string;

    switch (v.voucherType) {
      case 'Receipt':
        // Receipt: Debit Bank/Cash, Credit Party
        debitLedger = v.paymentMode === 'Cash' ? 'Cash' : 'KOTAK MAHINDRA BANK A/C 0247296457';
        creditLedger = partyName;
        break;
      case 'Payment':
        // Payment: Debit Party/Expense, Credit Bank/Cash
        debitLedger = ledgerName;
        creditLedger = v.paymentMode === 'Cash' ? 'Cash' : 'KOTAK MAHINDRA BANK A/C 0247296457';
        break;
      case 'Sales':
        // Sales: Debit Party, Credit Sales Account
        debitLedger = partyName;
        creditLedger = ledgerName || 'Fees Received';
        break;
      case 'Purchase':
        // Purchase: Debit Purchase Account, Credit Party
        debitLedger = ledgerName || 'Purchase Accounts';
        creditLedger = partyName;
        break;
      case 'Journal':
        // Journal: As specified
        debitLedger = ledgerName;
        creditLedger = partyName;
        break;
      case 'Contra':
        // Contra: Bank to Cash or vice versa
        debitLedger = ledgerName || 'Cash';
        creditLedger = partyName || 'KOTAK MAHINDRA BANK A/C 0247296457';
        break;
      default:
        debitLedger = partyName;
        creditLedger = ledgerName || 'Cash';
    }

    messages += `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="${escapeXml(tallyType)}" ACTION="Create">
        <DATE>${date}</DATE>
        <EFFECTIVEDATE>${date}</EFFECTIVEDATE>
        <VOUCHERTYPENAME>${escapeXml(tallyType)}</VOUCHERTYPENAME>${voucherNumber ? `
        <VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>` : ''}
        <NARRATION>${narration}</NARRATION>
        <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${debitLedger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${amount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${creditLedger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${amount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </TALLYMESSAGE>`;
  }

  return messages;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();

    await connectDB();

    const { searchParams } = request.nextUrl;
    const fy = searchParams.get('fy') || '2023-24';
    const type = searchParams.get('type') || 'all';

    const companyName = process.env.TALLY_PRIME_COMPANY_NAME || 'Upamnyu International Education P.ltd';

    let ledgerMessages = '';
    let voucherMessages = '';
    let ledgerCount = 0;
    let voucherCount = 0;

    // Fetch ledger/balance data
    if (type === 'all' || type === 'ledgers') {
      const ManualBalance = getTallyManualBalance();
      const entries = await ManualBalance.find({ financialYear: fy }).lean();
      ledgerCount = entries.length;
      ledgerMessages = generateLedgerXml(entries, companyName);
    }

    // Fetch voucher data
    if (type === 'all' || type === 'vouchers') {
      const ManualVoucher = getTallyManualVoucher();
      const vouchers = await ManualVoucher.find({ financialYear: fy }).sort({ date: 1 }).lean();
      voucherCount = vouchers.length;
      voucherMessages = generateVoucherXml(vouchers, companyName);
    }

    if (ledgerCount === 0 && voucherCount === 0) {
      return NextResponse.json({
        success: false,
        error: `No data found for FY ${fy}. Add opening balances or vouchers first.`,
      }, { status: 404 });
    }

    const { from, to, fromDisplay, toDisplay } = fyToDates(fy);

    // Build the complete Tally XML import envelope
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- 
  Tally Prime XML Import File
  Company: ${escapeXml(companyName)}
  Financial Year: ${fromDisplay} to ${toDisplay}
  Generated: ${new Date().toISOString()}
  Ledgers: ${ledgerCount} | Vouchers: ${voucherCount}
  
  HOW TO IMPORT:
  1. Open Tally Prime 3.0.1
  2. Open company: ${escapeXml(companyName)}
  3. Gateway of Tally → Import Data → select this XML file
  OR
  4. POST this file to http://localhost:9000 (Tally HTTP API)
-->
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters and Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <IMPORTDATA>
        <REQUESTDESC>
          <REPORTNAME>All Masters and Vouchers</REPORTNAME>
          <STATICVARIABLES>
            <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
          </STATICVARIABLES>
        </REQUESTDESC>
        <REQUESTDATA>${ledgerMessages}${voucherMessages}
        </REQUESTDATA>
      </IMPORTDATA>
    </DATA>
  </BODY>
</ENVELOPE>`;

    // Return as downloadable XML file
    const filename = `tally-import-${fy}-${type}.xml`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Ledger-Count': String(ledgerCount),
        'X-Voucher-Count': String(voucherCount),
      },
    });
  } catch (err: any) {
    console.error('Tally XML export error:', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate Tally XML: ' + (err.message || 'Unknown error'),
    }, { status: 500 });
  }
}
