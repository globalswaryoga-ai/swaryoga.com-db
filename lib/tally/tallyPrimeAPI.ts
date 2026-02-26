/**
 * Tally Prime 3.0.1 — Direct HTTP/XML API Connector
 *
 * Rebuilt: Proper amount handling using Tally's sign convention:
 *   - Debit  = POSITIVE  (Assets, Expenses)
 *   - Credit = NEGATIVE  (Liabilities, Income, Equity)
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
  /** Tally sign: positive = Debit, negative = Credit */
  openingBalance: number;
  /** Tally sign: positive = Debit, negative = Credit */
  closingBalance: number;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export interface TallyLedgerEntry {
  ledgerName: string;
  /** Tally sign: positive = Debit amount, negative = Credit amount */
  amount: number;
  isDeemedPositive: boolean;
}

export interface TallyVoucher {
  voucherNumber: string;
  voucherType: string;
  date: string;
  partyName: string;
  /** Always positive for display (absolute transaction value) */
  amount: number;
  narration?: string;
  ledgerEntries: TallyLedgerEntry[];
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
// Simple XML parser helpers
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

/** Get full tag blocks (including the tag itself) for nested parsing */
function extractTagBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[0]);
  return out;
}

/**
 * Parse a number from Tally XML.
 * Tally uses Indian format: "1,23,456.78" and sign for Dr/Cr.
 * PRESERVES the sign — positive = Debit, negative = Credit.
 */
function parseAmount(v: string): number {
  if (!v) return 0;
  const cleaned = v.replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Round to 2 decimal places to avoid floating point issues.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
    return { connected: false, error: 'Tally Prime is not configured. Set TALLY_PRIME_CONFIGURED=true in .env.local.' };
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
      ? 'Cannot connect to Tally. Ensure Tally Prime is running with ODBC/XML Server enabled (F12 → Advanced → Enable).'
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
// Fetch ledgers (preserving Tally sign convention)
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
    const items = extractTagBlocks(res, 'LEDGER');

    return items.map(block => ({
      name: extractTag(block, 'NAME'),
      parent: extractTag(block, 'PARENT'),
      // PRESERVE sign: positive = Debit balance, negative = Credit balance
      openingBalance: round2(parseAmount(extractTag(block, 'OPENINGBALANCE'))),
      closingBalance: round2(parseAmount(extractTag(block, 'CLOSINGBALANCE'))),
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
// Fetch vouchers with FULL ledger entries (double-entry preserved)
// ---------------------------------------------------------------------------
export async function fetchVouchers(
  voucherType: string,
  fromDate?: string,
  toDate?: string,
): Promise<TallyVoucher[]> {
  const { companyName } = getTallyConfig();

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
    const items = extractTagBlocks(res, 'VOUCHER');

    return items.map(block => {
      // Parse each ledger entry in the voucher (double-entry bookkeeping)
      const entryBlocks = extractTagBlocks(block, 'ALLLEDGERENTRIES.LIST');
      const ledgerEntries: TallyLedgerEntry[] = entryBlocks.map(eb => {
        const isDeemedPositive = extractTag(eb, 'ISDEEMEDPOSITIVE').toLowerCase() === 'yes';
        const rawAmt = parseAmount(extractTag(eb, 'AMOUNT'));
        return {
          ledgerName: extractTag(eb, 'LEDGERNAME'),
          // Tally stores: Debit entries as positive(+), Credit entries as negative(-)
          amount: round2(rawAmt),
          isDeemedPositive,
        };
      });

      // Transaction amount: sum of all debit-side entries (the transaction value)
      const debitTotal = ledgerEntries
        .filter(e => e.amount > 0)
        .reduce((s, e) => s + e.amount, 0);
      const creditTotal = ledgerEntries
        .filter(e => e.amount < 0)
        .reduce((s, e) => s + Math.abs(e.amount), 0);

      // For display: use the larger absolute value (debit and credit should match)
      const transactionAmount = round2(Math.max(debitTotal, creditTotal) || Math.abs(parseAmount(extractTag(block, 'AMOUNT'))));

      return {
        voucherNumber: extractTag(block, 'VOUCHERNUMBER'),
        voucherType: extractTag(block, 'VOUCHERTYPENAME') || voucherType,
        date: extractTag(block, 'DATE'),
        partyName: extractTag(block, 'PARTYLEDGERNAME'),
        amount: transactionAmount,
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
    const items = extractTagBlocks(res, 'STOCKITEM');

    return items.map(block => ({
      name: extractTag(block, 'NAME'),
      parent: extractTag(block, 'PARENT'),
      openingBalance: round2(parseAmount(extractTag(block, 'OPENINGBALANCE'))),
      openingRate: round2(parseAmount(extractTag(block, 'OPENINGRATE'))),
      openingValue: round2(parseAmount(extractTag(block, 'OPENINGVALUE'))),
      closingBalance: round2(parseAmount(extractTag(block, 'CLOSINGBALANCE'))),
      closingRate: round2(parseAmount(extractTag(block, 'CLOSINGRATE'))),
      closingValue: round2(parseAmount(extractTag(block, 'CLOSINGVALUE'))),
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
    const items = extractTagBlocks(res, 'VOUCHER');

    return items.map(block => {
      // Parse ledger entries for each day book voucher too
      const entryBlocks = extractTagBlocks(block, 'ALLLEDGERENTRIES.LIST');
      const ledgerEntries: TallyLedgerEntry[] = entryBlocks.map(eb => ({
        ledgerName: extractTag(eb, 'LEDGERNAME'),
        amount: round2(parseAmount(extractTag(eb, 'AMOUNT'))),
        isDeemedPositive: extractTag(eb, 'ISDEEMEDPOSITIVE').toLowerCase() === 'yes',
      }));

      // Compute transaction amount from double entry
      const debitTotal = ledgerEntries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
      const creditTotal = ledgerEntries.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
      const transactionAmount = round2(Math.max(debitTotal, creditTotal) || Math.abs(parseAmount(extractTag(block, 'AMOUNT'))));

      return {
        voucherNumber: extractTag(block, 'VOUCHERNUMBER'),
        voucherType: extractTag(block, 'VOUCHERTYPENAME'),
        date: extractTag(block, 'DATE'),
        partyName: extractTag(block, 'PARTYLEDGERNAME'),
        amount: transactionAmount,
        narration: extractTag(block, 'NARRATION'),
        ledgerEntries,
      };
    });
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

  // Sales/Receipts/Purchases: sum transaction amounts (already positive)
  const totalSales = round2(salesVouchers.reduce((s, v) => s + v.amount, 0));
  const totalReceipts = round2(receiptVouchers.reduce((s, v) => s + v.amount, 0));
  const totalPurchases = round2(purchaseVouchers.reduce((s, v) => s + v.amount, 0));

  // Debtors (positive balance = they owe us) and Creditors (negative balance = we owe them)
  const debtors = ledgers.filter(l => l.parent === 'Sundry Debtors');
  const creditors = ledgers.filter(l => l.parent === 'Sundry Creditors');
  // Debtors: sum only positive (debit) balances — money owed TO us
  const totalDebtors = round2(debtors.reduce((s, l) => s + Math.max(0, l.closingBalance), 0));
  // Creditors: sum absolute of negative (credit) balances — money we OWE
  const totalCreditors = round2(creditors.reduce((s, l) => s + Math.abs(Math.min(0, l.closingBalance)), 0));

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

// ---------------------------------------------------------------------------
// Profit & Loss — computed from Tally ledger closing balances
// ---------------------------------------------------------------------------
export interface PLGroup {
  name: string;
  amount: number;
  children: { name: string; amount: number }[];
}

export interface ProfitAndLoss {
  income: PLGroup[];
  expenses: PLGroup[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export async function fetchProfitAndLoss(fromDate?: string, toDate?: string): Promise<ProfitAndLoss> {
  const from = fromDate || '20230401';
  const to = toDate || '20260331';
  const company = getTallyConfig().companyName;

  // Fetch ALL P&L ledgers in a single request (income + expense)
  const plXml = `
<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>PLLedgers</ID></HEADER>
  <BODY><DESC>
    <STATICVARIABLES>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      <SVFROMDATE>${from}</SVFROMDATE>
      <SVTODATE>${to}</SVTODATE>
      <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
    </STATICVARIABLES>
    <TDL><TDLMESSAGE>
      <COLLECTION NAME="PLLedgers" ISMODIFY="No">
        <TYPE>Ledger</TYPE>
        <FILTER>IsPLLedger</FILTER>
        <NATIVEMETHOD>Name</NATIVEMETHOD>
        <NATIVEMETHOD>Parent</NATIVEMETHOD>
        <NATIVEMETHOD>ClosingBalance</NATIVEMETHOD>
      </COLLECTION>
      <SYSTEM TYPE="Formulae" NAME="IsPLLedger">
        $IsPLAccount AND $ClosingBalance != 0
      </SYSTEM>
    </TDLMESSAGE></TDL>
  </DESC></BODY>
</ENVELOPE>`;

  try {
    const res = await sendTallyRequest(plXml, 20000);
    const blocks = extractTagBlocks(res, 'LEDGER');

    const incomeLedgers: { name: string; parent: string; amount: number }[] = [];
    const expenseLedgers: { name: string; parent: string; amount: number }[] = [];

    for (const block of blocks) {
      const name = extractTag(block, 'NAME');
      const parent = extractTag(block, 'PARENT');
      const closingBalance = parseAmount(extractTag(block, 'CLOSINGBALANCE'));

      if (!name || closingBalance === 0) continue;

      // Tally convention for P&L:
      // Income ledgers have NEGATIVE closing balance (Credit = income earned)
      // Expense ledgers have POSITIVE closing balance (Debit = expense incurred)
      if (closingBalance < 0) {
        incomeLedgers.push({ name, parent, amount: round2(Math.abs(closingBalance)) });
      } else {
        expenseLedgers.push({ name, parent, amount: round2(closingBalance) });
      }
    }

    // Group by parent account
    const groupByParent = (items: typeof incomeLedgers): PLGroup[] => {
      const map = new Map<string, { name: string; amount: number }[]>();
      for (const item of items) {
        const key = item.parent || 'Other';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ name: item.name, amount: item.amount });
      }
      return Array.from(map.entries()).map(([name, children]) => ({
        name,
        amount: round2(children.reduce((s, c) => s + c.amount, 0)),
        children: children.sort((a, b) => b.amount - a.amount),
      })).sort((a, b) => b.amount - a.amount);
    };

    const income = groupByParent(incomeLedgers);
    const expenses = groupByParent(expenseLedgers);
    const totalIncome = round2(income.reduce((s, g) => s + g.amount, 0));
    const totalExpenses = round2(expenses.reduce((s, g) => s + g.amount, 0));

    return {
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit: round2(totalIncome - totalExpenses),
    };
  } catch (err) {
    console.error('[TallyPrimeAPI] P&L fetch failed:', err);

    // Fallback: use voucher totals
    const [sales, purchases] = await Promise.all([
      fetchVouchers('Sales', fromDate, toDate),
      fetchVouchers('Purchase', fromDate, toDate),
    ]);

    const totalSales = round2(sales.reduce((s, v) => s + v.amount, 0));
    const totalPurchases = round2(purchases.reduce((s, v) => s + v.amount, 0));

    return {
      income: [{ name: 'Sales', amount: totalSales, children: [] }],
      expenses: [{ name: 'Purchases', amount: totalPurchases, children: [] }],
      totalIncome: totalSales,
      totalExpenses: totalPurchases,
      netProfit: round2(totalSales - totalPurchases),
    };
  }
}

// ---------------------------------------------------------------------------
// Balance Sheet — computed from non-P&L ledger closing balances
// ---------------------------------------------------------------------------
export interface BSGroup {
  name: string;
  amount: number;
  children: { name: string; amount: number }[];
}

export interface BalanceSheet {
  assets: BSGroup[];
  liabilities: BSGroup[];
  totalAssets: number;
  totalLiabilities: number;
  difference: number;
}

export async function fetchBalanceSheet(fromDate?: string, toDate?: string): Promise<BalanceSheet> {
  const from = fromDate || '20230401';
  const to = toDate || '20260331';
  const company = getTallyConfig().companyName;

  // Fetch all non-P&L ledgers (Balance Sheet accounts)
  const bsXml = `
<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>BSLedgers</ID></HEADER>
  <BODY><DESC>
    <STATICVARIABLES>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      <SVFROMDATE>${from}</SVFROMDATE>
      <SVTODATE>${to}</SVTODATE>
      <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
    </STATICVARIABLES>
    <TDL><TDLMESSAGE>
      <COLLECTION NAME="BSLedgers" ISMODIFY="No">
        <TYPE>Ledger</TYPE>
        <FILTER>IsBSLedger</FILTER>
        <NATIVEMETHOD>Name</NATIVEMETHOD>
        <NATIVEMETHOD>Parent</NATIVEMETHOD>
        <NATIVEMETHOD>ClosingBalance</NATIVEMETHOD>
      </COLLECTION>
      <SYSTEM TYPE="Formulae" NAME="IsBSLedger">
        NOT $IsPLAccount AND $ClosingBalance != 0
      </SYSTEM>
    </TDLMESSAGE></TDL>
  </DESC></BODY>
</ENVELOPE>`;

  try {
    const res = await sendTallyRequest(bsXml, 20000);
    const blocks = extractTagBlocks(res, 'LEDGER');

    const assetLedgers: { name: string; parent: string; amount: number }[] = [];
    const liabilityLedgers: { name: string; parent: string; amount: number }[] = [];

    for (const block of blocks) {
      const name = extractTag(block, 'NAME');
      const parent = extractTag(block, 'PARENT');
      const closingBalance = parseAmount(extractTag(block, 'CLOSINGBALANCE'));

      if (!name || closingBalance === 0) continue;

      // Tally convention for Balance Sheet:
      // POSITIVE closing balance (Debit) = Asset
      // NEGATIVE closing balance (Credit) = Liability / Equity
      if (closingBalance > 0) {
        assetLedgers.push({ name, parent, amount: round2(closingBalance) });
      } else {
        liabilityLedgers.push({ name, parent, amount: round2(Math.abs(closingBalance)) });
      }
    }

    // Group by parent account
    const groupByParent = (items: typeof assetLedgers): BSGroup[] => {
      const map = new Map<string, { name: string; amount: number }[]>();
      for (const item of items) {
        const key = item.parent || 'Other';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ name: item.name, amount: item.amount });
      }
      return Array.from(map.entries()).map(([name, children]) => ({
        name,
        amount: round2(children.reduce((s, c) => s + c.amount, 0)),
        children: children.sort((a, b) => b.amount - a.amount),
      })).sort((a, b) => b.amount - a.amount);
    };

    const assets = groupByParent(assetLedgers);
    const liabilities = groupByParent(liabilityLedgers);
    const totalAssets = round2(assets.reduce((s, g) => s + g.amount, 0));
    const totalLiabilities = round2(liabilities.reduce((s, g) => s + g.amount, 0));

    return {
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
      difference: round2(totalAssets - totalLiabilities),
    };
  } catch (err) {
    console.error('[TallyPrimeAPI] BS fetch failed:', err);

    // Fallback: use all ledgers
    const ledgers = await fetchLedgers();

    const ASSET_GROUPS = new Set([
      'Bank Accounts', 'Cash-in-Hand', 'Sundry Debtors', 'Fixed Assets',
      'Investments', 'Stock-in-Hand', 'Deposits (Asset)', 'Loans & Advances (Asset)',
      'Current Assets',
    ]);
    const LIABILITY_GROUPS = new Set([
      'Sundry Creditors', 'Capital Account', 'Reserves & Surplus',
      'Secured Loans', 'Unsecured Loans', 'Current Liabilities',
      'Duties & Taxes', 'Provisions',
    ]);
    const PL_GROUPS = new Set([
      'Direct Expenses', 'Indirect Expenses', 'Sales Accounts',
      'Purchase Accounts', 'Direct Incomes', 'Indirect Incomes',
    ]);

    const assetLedgers = ledgers.filter(l =>
      !PL_GROUPS.has(l.parent) && (ASSET_GROUPS.has(l.parent) || l.closingBalance > 0)
    );
    const liabLedgers = ledgers.filter(l =>
      !PL_GROUPS.has(l.parent) && (LIABILITY_GROUPS.has(l.parent) || l.closingBalance < 0)
    );

    const groupByParent = (items: typeof ledgers): BSGroup[] => {
      const map = new Map<string, { name: string; amount: number }[]>();
      for (const item of items) {
        const key = item.parent || 'Other';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ name: item.name, amount: round2(Math.abs(item.closingBalance)) });
      }
      return Array.from(map.entries()).map(([name, children]) => ({
        name,
        amount: round2(children.reduce((s, c) => s + c.amount, 0)),
        children: children.sort((a, b) => b.amount - a.amount),
      })).sort((a, b) => b.amount - a.amount);
    };

    const assets = groupByParent(assetLedgers);
    const liabilities = groupByParent(liabLedgers);
    const totalAssets = round2(assets.reduce((s, g) => s + g.amount, 0));
    const totalLiabilities = round2(liabilities.reduce((s, g) => s + g.amount, 0));

    return { assets, liabilities, totalAssets, totalLiabilities, difference: round2(totalAssets - totalLiabilities) };
  }
}
