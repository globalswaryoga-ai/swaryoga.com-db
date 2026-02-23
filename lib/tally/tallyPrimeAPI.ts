/**
 * Tally Prime 3.0.1 — Direct HTTP/XML API Connector
 *
 * Tally Prime exposes an HTTP server (default port 9000) that accepts
 * XML request bodies and returns XML responses.  This module wraps
 * those low-level calls into typed async helpers the rest of the app
 * can consume.
 *
 * ENV vars required (see .env.local):
 *   TALLY_PRIME_URL             – e.g. http://localhost:9000
 *   TALLY_PRIME_COMPANY_NAME    – company name configured inside Tally
 *   TALLY_PRIME_SERIAL_NUMBER   – licence serial number
 *   TALLY_PRIME_CONFIGURED      – set "true" after filling fields
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TallyConfig {
  url: string;
  companyName: string;
  serialNumber: string;
  email: string;
  password: string;
  configured: boolean;
}

export interface TallyCompanyInfo {
  name: string;
  formalName?: string;
  address?: string;
  state?: string;
  pinCode?: string;
  phone?: string;
  email?: string;
  financialYearFrom?: string;
  financialYearTo?: string;
  booksFrom?: string;
}

export interface TallyLedger {
  name: string;
  parent: string;
  openingBalance: number;
  closingBalance: number;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export interface TallyVoucher {
  voucherNumber: string;
  voucherType: string;
  date: string;
  partyName: string;
  amount: number;
  narration?: string;
  ledgerEntries: { ledgerName: string; amount: number }[];
}

export interface TallyStockItem {
  name: string;
  parent: string;
  openingBalance: number;
  openingRate: number;
  openingValue: number;
  closingBalance: number;
  closingRate: number;
  closingValue: number;
  unit?: string;
}

export interface TallySyncResult {
  type: string;
  totalFetched: number;
  totalSynced: number;
  totalFailed: number;
  errors: string[];
  duration: number;
}

// ---------------------------------------------------------------------------
// Config helper
// ---------------------------------------------------------------------------
export function getTallyConfig(): TallyConfig {
  return {
    url: process.env.TALLY_PRIME_URL || 'http://localhost:9000',
    companyName: process.env.TALLY_PRIME_COMPANY_NAME || '',
    serialNumber: process.env.TALLY_PRIME_SERIAL_NUMBER || '',
    email: process.env.TALLY_PRIME_EMAIL || '',
    password: process.env.TALLY_PRIME_PASSWORD || '',
    configured: process.env.TALLY_PRIME_CONFIGURED === 'true',
  };
}

// ---------------------------------------------------------------------------
// Low-level XML sender
// ---------------------------------------------------------------------------
async function sendTallyRequest(xml: string, timeoutMs = 15000): Promise<string> {
  const { url } = getTallyConfig();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xml,
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Tally returned HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Simple XML parser helpers  (Tally XML is simple, no need for heavy lib)
// ---------------------------------------------------------------------------
function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

function extractTagAttr(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[0]);
  return out;
}

function num(v: string): number {
  const n = parseFloat((v || '0').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------
export async function testTallyConnection(): Promise<{
  connected: boolean;
  companyName?: string;
  tallyVersion?: string;
  error?: string;
}> {
  const config = getTallyConfig();
  if (!config.configured) {
    return { connected: false, error: 'Tally Prime is not configured yet. Please update .env.local fields.' };
  }

  const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>List of Companies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

  try {
    const response = await sendTallyRequest(xml, 8000);
    const companies = extractAllTags(response, 'COMPANY');

    return {
      connected: true,
      companyName: companies.length > 0 ? companies[0] : 'Unknown',
      tallyVersion: extractTag(response, 'TALLYVERSION') || 'Tally Prime',
    };
  } catch (err: any) {
    const msg = err?.cause?.code === 'ECONNREFUSED'
      ? 'Cannot connect to Tally. Make sure Tally Prime is running and ODBC/XML Server is enabled (F12 → Advanced → Enable).'
      : err.message || 'Unknown error';
    return { connected: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Fetch company info
// ---------------------------------------------------------------------------
export async function fetchCompanyInfo(): Promise<TallyCompanyInfo | null> {
  const { companyName } = getTallyConfig();

  const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Company</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

  try {
    const res = await sendTallyRequest(xml);
    return {
      name: extractTag(res, 'NAME') || companyName,
      formalName: extractTag(res, 'FORMALNAME'),
      address: extractTag(res, 'ADDRESS'),
      state: extractTag(res, 'STATENAME'),
      pinCode: extractTag(res, 'PINCODE'),
      phone: extractTag(res, 'PHONENUMBER'),
      email: extractTag(res, 'EMAIL'),
      financialYearFrom: extractTag(res, 'STARTINGFROM'),
      financialYearTo: extractTag(res, 'ENDINGAT'),
      booksFrom: extractTag(res, 'BOOKSFROM'),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch ledgers (customers / debtors / creditors / all)
// ---------------------------------------------------------------------------
export async function fetchLedgers(group?: string): Promise<TallyLedger[]> {
  const { companyName } = getTallyConfig();
  const filterClause = group
    ? `<AND><CMPFIRSTSIMPLEFIELD>Group</CMPFIRSTSIMPLEFIELD><CMPFIRSTVALUE>${group}</CMPFIRSTVALUE></AND>`
    : '';

  const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>AllLedgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="AllLedgers" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <TYPE>Ledger</TYPE>
            <NATIVEMETHOD>Name, Parent, OpeningBalance, ClosingBalance, Address, LedgerPhone, LedgerEmail, PartyGSTIN</NATIVEMETHOD>
            ${filterClause ? `<FILTER>GroupFilter</FILTER>` : ''}
          </COLLECTION>
          ${filterClause ? `<SYSTEM TYPE="Formulae" NAME="GroupFilter">${filterClause}</SYSTEM>` : ''}
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

  try {
    const res = await sendTallyRequest(xml, 20000);
    const items = extractTagAttr(res, 'LEDGER');

    return items.map(block => ({
      name: extractTag(block, 'NAME'),
      parent: extractTag(block, 'PARENT'),
      openingBalance: num(extractTag(block, 'OPENINGBALANCE')),
      closingBalance: num(extractTag(block, 'CLOSINGBALANCE')),
      address: extractTag(block, 'ADDRESS'),
      phone: extractTag(block, 'LEDGERPHONE'),
      email: extractTag(block, 'LEDGEREMAIL'),
      gstin: extractTag(block, 'PARTYGSTIN'),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fetch vouchers (Sales / Purchase / Receipt / Payment / Journal)
// ---------------------------------------------------------------------------
export async function fetchVouchers(
  voucherType: string,
  fromDate?: string,
  toDate?: string,
): Promise<TallyVoucher[]> {
  const { companyName } = getTallyConfig();

  // Date format for Tally: YYYYMMDD — go back to FY 2023-24 to cover older data
  const from = fromDate || '20230401';
  const to = toDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>VoucherCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE>${from}</SVFROMDATE>
        <SVTODATE>${to}</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="VoucherCollection" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <TYPE>Voucher</TYPE>
            <NATIVEMETHOD>VoucherNumber, VoucherTypeName, Date, PartyLedgerName, Amount, Narration</NATIVEMETHOD>
            <FILTER>VchTypeFilter</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="VchTypeFilter">
            <AND>
              <CMPFIRSTSIMPLEFIELD>VoucherTypeName</CMPFIRSTSIMPLEFIELD>
              <CMPFIRSTVALUE>${voucherType}</CMPFIRSTVALUE>
            </AND>
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

  try {
    const res = await sendTallyRequest(xml, 30000);
    const items = extractTagAttr(res, 'VOUCHER');

    return items.map(block => {
      // Parse ledger entries
      const entryBlocks = extractTagAttr(block, 'ALLLEDGERENTRIES.LIST');
      const ledgerEntries = entryBlocks.map(eb => ({
        ledgerName: extractTag(eb, 'LEDGERNAME'),
        amount: num(extractTag(eb, 'AMOUNT')),
      }));

      return {
        voucherNumber: extractTag(block, 'VOUCHERNUMBER'),
        voucherType: extractTag(block, 'VOUCHERTYPENAME') || voucherType,
        date: extractTag(block, 'DATE'),
        partyName: extractTag(block, 'PARTYLEDGERNAME'),
        amount: Math.abs(num(extractTag(block, 'AMOUNT'))),
        narration: extractTag(block, 'NARRATION'),
        ledgerEntries,
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fetch stock/inventory items
// ---------------------------------------------------------------------------
export async function fetchStockItems(): Promise<TallyStockItem[]> {
  const { companyName } = getTallyConfig();

  const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>StockItemCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="StockItemCollection" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <TYPE>StockItem</TYPE>
            <NATIVEMETHOD>Name, Parent, OpeningBalance, OpeningRate, OpeningValue, ClosingBalance, ClosingRate, ClosingValue, BaseUnits</NATIVEMETHOD>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

  try {
    const res = await sendTallyRequest(xml, 20000);
    const items = extractTagAttr(res, 'STOCKITEM');

    return items.map(block => ({
      name: extractTag(block, 'NAME'),
      parent: extractTag(block, 'PARENT'),
      openingBalance: num(extractTag(block, 'OPENINGBALANCE')),
      openingRate: num(extractTag(block, 'OPENINGRATE')),
      openingValue: num(extractTag(block, 'OPENINGVALUE')),
      closingBalance: num(extractTag(block, 'CLOSINGBALANCE')),
      closingRate: num(extractTag(block, 'CLOSINGRATE')),
      closingValue: num(extractTag(block, 'CLOSINGVALUE')),
      unit: extractTag(block, 'BASEUNITS'),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Day book (all vouchers for a date range)
// ---------------------------------------------------------------------------
export async function fetchDayBook(
  fromDate?: string,
  toDate?: string,
): Promise<TallyVoucher[]> {
  const { companyName } = getTallyConfig();
  const from = fromDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const to = toDate || from;

  const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>DayBookVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE>${from}</SVFROMDATE>
        <SVTODATE>${to}</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="DayBookVouchers" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <TYPE>Voucher</TYPE>
            <NATIVEMETHOD>VoucherNumber, VoucherTypeName, Date, PartyLedgerName, Amount, Narration</NATIVEMETHOD>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

  try {
    const res = await sendTallyRequest(xml, 30000);
    const items = extractTagAttr(res, 'VOUCHER');

    return items.map(block => ({
      voucherNumber: extractTag(block, 'VOUCHERNUMBER'),
      voucherType: extractTag(block, 'VOUCHERTYPENAME'),
      date: extractTag(block, 'DATE'),
      partyName: extractTag(block, 'PARTYLEDGERNAME'),
      amount: Math.abs(num(extractTag(block, 'AMOUNT'))),
      narration: extractTag(block, 'NARRATION'),
      ledgerEntries: [],
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Quick dashboard summary
// ---------------------------------------------------------------------------
export async function fetchDashboardSummary(fromDate?: string, toDate?: string) {
  const [company, salesVouchers, receiptVouchers, purchaseVouchers, ledgers] =
    await Promise.all([
      fetchCompanyInfo(),
      fetchVouchers('Sales', fromDate, toDate),
      fetchVouchers('Receipt', fromDate, toDate),
      fetchVouchers('Purchase', fromDate, toDate),
      fetchLedgers(),
    ]);

  const totalSales = salesVouchers.reduce((s, v) => s + v.amount, 0);
  const totalReceipts = receiptVouchers.reduce((s, v) => s + v.amount, 0);
  const totalPurchases = purchaseVouchers.reduce((s, v) => s + v.amount, 0);

  // Separate debtors / creditors from ledgers
  const debtors = ledgers.filter(l => l.parent === 'Sundry Debtors');
  const creditors = ledgers.filter(l => l.parent === 'Sundry Creditors');
  const totalDebtors = debtors.reduce((s, l) => s + Math.abs(l.closingBalance), 0);
  const totalCreditors = creditors.reduce((s, l) => s + Math.abs(l.closingBalance), 0);

  return {
    company,
    totalSales,
    totalReceipts,
    totalPurchases,
    totalDebtors,
    totalCreditors,
    salesCount: salesVouchers.length,
    receiptCount: receiptVouchers.length,
    purchaseCount: purchaseVouchers.length,
    debtorCount: debtors.length,
    creditorCount: creditors.length,
    recentSales: salesVouchers.slice(-10).reverse(),
    recentReceipts: receiptVouchers.slice(-10).reverse(),
  };
}
