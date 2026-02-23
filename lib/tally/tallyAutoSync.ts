/**
 * Tally Prime Auto-Sync via XML API
 *
 * Pulls data from Tally Prime's live HTTP/XML API (port 9000)
 * and persists it into MongoDB collections for offline access.
 *
 * Collections synced:
 *   - tally_customers  (from Sundry Debtors ledger group)
 *   - tally_invoices   (from Sales vouchers)
 *   - tally_payments   (from Receipt vouchers)
 *   - tally_sync_logs  (audit trail)
 */

import { connectDB } from '@/lib/db';
import {
  getTallyCustomer,
  getTallyInvoice,
  getTallyPayment,
  getTallySyncLog,
} from '@/lib/schemas/enterpriseSchemas';
import {
  fetchLedgers,
  fetchVouchers,
  testTallyConnection,
  type TallyLedger,
  type TallyVoucher,
} from '@/lib/tally/tallyPrimeAPI';

// ─── Sync customers (Sundry Debtors) ───────────────────────────
async function syncCustomers(): Promise<{ succeeded: number; failed: number; errors: string[] }> {
  const TallyCustomer = getTallyCustomer();
  const ledgers = await fetchLedgers('Sundry Debtors');
  let succeeded = 0, failed = 0;
  const errors: string[] = [];

  for (const l of ledgers) {
    try {
      await TallyCustomer.findOneAndUpdate(
        { tallyId: l.name }, // use name as unique key since XML API doesn't give IDs
        {
          tallyId: l.name,
          tallyName: l.name,
          email: l.email || undefined,
          phone: l.phone || undefined,
          gstin: l.gstin || undefined,
          totalPending: Math.abs(l.closingBalance),
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: l,
        },
        { upsert: true, new: true },
      );
      succeeded++;
    } catch (err: any) {
      failed++;
      errors.push(`Customer "${l.name}": ${err.message}`);
    }
  }

  return { succeeded, failed, errors };
}

// ─── Sync invoices (Sales vouchers) ────────────────────────────
async function syncInvoices(fromDate?: string, toDate?: string): Promise<{ succeeded: number; failed: number; errors: string[] }> {
  const TallyInvoice = getTallyInvoice();
  const vouchers = await fetchVouchers('Sales', fromDate, toDate);
  let succeeded = 0, failed = 0;
  const errors: string[] = [];

  for (const v of vouchers) {
    try {
      const key = v.voucherNumber || `${v.date}-${v.partyName}-${v.amount}`;
      await TallyInvoice.findOneAndUpdate(
        { tallyId: key },
        {
          tallyId: key,
          tallyInvoiceNumber: v.voucherNumber || key,
          tallyCustomerId: v.partyName,
          date: parseTallyDate(v.date),
          lineItems: v.ledgerEntries?.map(e => ({
            description: e.ledgerName,
            quantity: 1,
            rate: Math.abs(e.amount),
          })) || [],
          total: v.amount,
          subtotal: v.amount,
          gst: 0,
          paymentStatus: 'unpaid',
          paidAmount: 0,
          pendingAmount: v.amount,
          notes: v.narration || '',
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: v,
        },
        { upsert: true, new: true },
      );
      succeeded++;
    } catch (err: any) {
      failed++;
      errors.push(`Invoice "${v.voucherNumber}": ${err.message}`);
    }
  }

  return { succeeded, failed, errors };
}

// ─── Sync payments (Receipt vouchers) ──────────────────────────
async function syncPayments(fromDate?: string, toDate?: string): Promise<{ succeeded: number; failed: number; errors: string[] }> {
  const TallyPayment = getTallyPayment();
  const vouchers = await fetchVouchers('Receipt', fromDate, toDate);
  let succeeded = 0, failed = 0;
  const errors: string[] = [];

  for (const v of vouchers) {
    try {
      const key = v.voucherNumber || `${v.date}-${v.partyName}-${v.amount}`;
      await TallyPayment.findOneAndUpdate(
        { tallyId: key },
        {
          tallyId: key,
          tallyPaymentVoucher: v.voucherNumber || key,
          tallyCustomerId: v.partyName,
          paymentDate: parseTallyDate(v.date),
          paymentMethod: 'other',
          amount: v.amount,
          notes: v.narration || '',
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: v,
        },
        { upsert: true, new: true },
      );
      succeeded++;
    } catch (err: any) {
      failed++;
      errors.push(`Payment "${v.voucherNumber}": ${err.message}`);
    }
  }

  return { succeeded, failed, errors };
}

// ─── Helper: parse Tally date (YYYYMMDD) ───────────────────────
function parseTallyDate(d: string): Date {
  if (!d || d.length !== 8) return new Date();
  return new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`);
}

// ─── Full auto-sync ────────────────────────────────────────────
export async function runTallyAutoSync(fromDate?: string, toDate?: string) {
  await connectDB();
  const TallySyncLog = getTallySyncLog();
  const startTime = Date.now();

  // Check connection first
  const conn = await testTallyConnection();
  if (!conn.connected) {
    const log = await TallySyncLog.create({
      syncType: 'all',
      status: 'failed',
      totalProcessed: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      errors: [{ recordId: 'connection', error: conn.error || 'Cannot connect to Tally Prime' }],
      startTime: new Date(startTime),
      endTime: new Date(),
      details: { connection: conn },
    });
    return {
      success: false,
      error: conn.error || 'Cannot connect to Tally Prime',
      logId: log._id,
    };
  }

  // Run all syncs
  const [customerResult, invoiceResult, paymentResult] = await Promise.all([
    syncCustomers(),
    syncInvoices(fromDate, toDate),
    syncPayments(fromDate, toDate),
  ]);

  const totalSucceeded = customerResult.succeeded + invoiceResult.succeeded + paymentResult.succeeded;
  const totalFailed = customerResult.failed + invoiceResult.failed + paymentResult.failed;
  const totalProcessed = totalSucceeded + totalFailed;
  const allErrors = [
    ...customerResult.errors,
    ...invoiceResult.errors,
    ...paymentResult.errors,
  ];

  const status = totalFailed === 0 ? 'success' : totalSucceeded === 0 ? 'failed' : 'partial';

  const log = await TallySyncLog.create({
    syncType: 'all',
    status,
    totalProcessed,
    totalSucceeded,
    totalFailed,
    errors: allErrors.map(e => ({ recordId: '', error: e })),
    startTime: new Date(startTime),
    endTime: new Date(),
    details: {
      customers: customerResult,
      invoices: invoiceResult,
      payments: paymentResult,
      fromDate,
      toDate,
      duration: Date.now() - startTime,
    },
  });

  return {
    success: true,
    status,
    logId: log._id,
    duration: Date.now() - startTime,
    customers: customerResult,
    invoices: invoiceResult,
    payments: paymentResult,
    totalProcessed,
    totalSucceeded,
    totalFailed,
  };
}

// ─── Get last sync info ────────────────────────────────────────
export async function getLastSyncInfo() {
  await connectDB();
  const TallySyncLog = getTallySyncLog();
  const TallyCustomer = getTallyCustomer();
  const TallyInvoice = getTallyInvoice();
  const TallyPayment = getTallyPayment();

  const [lastSync, customerCount, invoiceCount, paymentCount] = await Promise.all([
    TallySyncLog.findOne().sort({ createdAt: -1 }).lean(),
    TallyCustomer.countDocuments(),
    TallyInvoice.countDocuments(),
    TallyPayment.countDocuments(),
  ]);

  return {
    lastSync: lastSync ? {
      status: (lastSync as any).status,
      syncedAt: (lastSync as any).createdAt,
      totalProcessed: (lastSync as any).totalProcessed,
      totalSucceeded: (lastSync as any).totalSucceeded,
      totalFailed: (lastSync as any).totalFailed,
      duration: (lastSync as any).details?.duration || 0,
    } : null,
    counts: {
      customers: customerCount,
      invoices: invoiceCount,
      payments: paymentCount,
    },
  };
}
