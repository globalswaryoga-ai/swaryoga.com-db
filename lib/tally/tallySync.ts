/**
 * Tally Prime → MongoDB Sync Utilities
 *
 * Syncs live data from Tally Prime (HTTP/XML on port 9000) into MongoDB.
 * All amounts are handled using Tally's sign convention:
 *   Debit = positive, Credit = negative
 *
 * Data sources (in priority order):
 *   1. Tally Prime live API
 *   2. Manual entries in tally_manual_vouchers / tally_manual_balances
 *   3. CSV files (legacy fallback)
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
  type TallyLedger,
  type TallyVoucher,
} from '@/lib/tally/tallyPrimeAPI';

// ---------------------------------------------------------------------------
// Types for raw data (CSV / manual fallback)
// ---------------------------------------------------------------------------
export interface TallyRawCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  gstin?: string;
}

export interface TallyRawInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  date: string;
  dueDate?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    rate: number;
  }>;
  subtotal: number;
  gst: number;
  total: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paidAmount: number;
  notes?: string;
}

export interface TallyRawPayment {
  id: string;
  voucherNumber: string;
  customerId: string;
  invoiceIds?: string[];
  date: string;
  method: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Helper: round to 2 decimal places
// ---------------------------------------------------------------------------
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Sync customers from Tally Prime ledgers → MongoDB
// ---------------------------------------------------------------------------
export async function syncTallyCustomersFromPrime(): Promise<{
  succeeded: number;
  failed: number;
  errors: any[];
}> {
  await connectDB();
  const TallyCustomer = getTallyCustomer();
  const results = { succeeded: 0, failed: 0, errors: [] as any[] };

  // Fetch Sundry Debtors (customers who owe us)
  const debtors = await fetchLedgers('Sundry Debtors');
  if (debtors.length === 0) {
    console.log('[TallySync] No Sundry Debtors found in Tally Prime');
    return results;
  }

  for (const ledger of debtors) {
    try {
      const tallyId = `LEDGER-${ledger.name}`;

      await TallyCustomer.findOneAndUpdate(
        { tallyId },
        {
          tallyId,
          tallyName: ledger.name,
          email: ledger.email || undefined,
          phone: ledger.phone || undefined,
          address: ledger.address || undefined,
          gstin: ledger.gstin || undefined,
          // Debtors: positive = they owe us, negative = we owe them (advance)
          totalAmount: round2(Math.abs(ledger.closingBalance)),
          totalPending: round2(Math.max(0, ledger.closingBalance)),
          totalPaid: 0, // Will be calculated from receipt vouchers
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: ledger,
        },
        { upsert: true, new: true }
      );
      results.succeeded++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ ledgerName: ledger.name, error: error.message });
      console.error(`[TallySync] Customer sync error for ${ledger.name}:`, error.message);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Sync invoices from Tally Prime Sales vouchers → MongoDB
// ---------------------------------------------------------------------------
export async function syncTallyInvoicesFromPrime(
  fromDate?: string,
  toDate?: string,
): Promise<{ succeeded: number; failed: number; errors: any[] }> {
  await connectDB();
  const TallyInvoice = getTallyInvoice();
  const TallyCustomer = getTallyCustomer();
  const results = { succeeded: 0, failed: 0, errors: [] as any[] };

  const salesVouchers = await fetchVouchers('Sales', fromDate, toDate);
  if (salesVouchers.length === 0) {
    console.log('[TallySync] No Sales vouchers found in Tally Prime');
    return results;
  }

  for (const voucher of salesVouchers) {
    try {
      const tallyId = `SALE-${voucher.voucherNumber}-${voucher.date}`;

      // Find linked customer
      const customerId = `LEDGER-${voucher.partyName}`;
      const linkedCustomer = await TallyCustomer.findOne({ tallyId: customerId });

      // Break down the voucher ledger entries to get tax and line items
      let subtotal = 0;
      let gst = 0;
      const lineItems: { description: string; quantity: number; rate: number; amount: number }[] = [];

      for (const entry of voucher.ledgerEntries) {
        const name = entry.ledgerName.toLowerCase();
        // Tax entries (CGST, SGST, IGST, etc.)
        if (name.includes('gst') || name.includes('tax') || name.includes('cess')) {
          // Tax is typically a credit entry in sales (negative in Tally)
          gst += round2(Math.abs(entry.amount));
        } else if (entry.amount < 0) {
          // Credit entries (other than party) = income / sales
          subtotal += round2(Math.abs(entry.amount));
          lineItems.push({
            description: entry.ledgerName,
            quantity: 1,
            rate: round2(Math.abs(entry.amount)),
            amount: round2(Math.abs(entry.amount)),
          });
        }
      }

      // Total = voucher amount (always positive for display)
      const total = round2(voucher.amount);
      if (subtotal === 0) subtotal = round2(total - gst);

      await TallyInvoice.findOneAndUpdate(
        { tallyId },
        {
          tallyId,
          tallyInvoiceNumber: voucher.voucherNumber,
          tallyCustomerId: customerId,
          linkedCustomerId: linkedCustomer?._id,
          date: new Date(
            voucher.date.length === 8
              ? `${voucher.date.slice(0, 4)}-${voucher.date.slice(4, 6)}-${voucher.date.slice(6, 8)}`
              : voucher.date
          ),
          lineItems,
          subtotal,
          gst,
          total,
          paymentStatus: 'unpaid', // Will be reconciled with Receipt vouchers
          paidAmount: 0,
          pendingAmount: total,
          notes: voucher.narration,
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: voucher,
        },
        { upsert: true, new: true }
      );
      results.succeeded++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ voucherNumber: voucher.voucherNumber, error: error.message });
      console.error(`[TallySync] Invoice sync error for ${voucher.voucherNumber}:`, error.message);
    }
  }

  // After syncing invoices, reconcile payment status with receipts
  await reconcilePaymentStatus();

  return results;
}

// ---------------------------------------------------------------------------
// Sync payments from Tally Prime Receipt vouchers → MongoDB
// ---------------------------------------------------------------------------
export async function syncTallyPaymentsFromPrime(
  fromDate?: string,
  toDate?: string,
): Promise<{ succeeded: number; failed: number; errors: any[] }> {
  await connectDB();
  const TallyPayment = getTallyPayment();
  const results = { succeeded: 0, failed: 0, errors: [] as any[] };

  const receiptVouchers = await fetchVouchers('Receipt', fromDate, toDate);
  if (receiptVouchers.length === 0) {
    console.log('[TallySync] No Receipt vouchers found in Tally Prime');
    return results;
  }

  for (const voucher of receiptVouchers) {
    try {
      const tallyId = `RCPT-${voucher.voucherNumber}-${voucher.date}`;

      // Determine payment method from ledger entries
      let paymentMethod: string = 'other';
      for (const entry of voucher.ledgerEntries) {
        const name = entry.ledgerName.toLowerCase();
        if (name.includes('bank') || name.includes('kotak')) paymentMethod = 'bank_transfer';
        else if (name.includes('cash')) paymentMethod = 'cash';
        else if (name.includes('cheque')) paymentMethod = 'cheque';
        else if (name.includes('online') || name.includes('upi') || name.includes('paytm')) paymentMethod = 'online';
      }

      await TallyPayment.findOneAndUpdate(
        { tallyId },
        {
          tallyId,
          tallyPaymentVoucher: voucher.voucherNumber,
          tallyCustomerId: `LEDGER-${voucher.partyName}`,
          paymentDate: new Date(
            voucher.date.length === 8
              ? `${voucher.date.slice(0, 4)}-${voucher.date.slice(4, 6)}-${voucher.date.slice(6, 8)}`
              : voucher.date
          ),
          paymentMethod,
          amount: round2(voucher.amount),
          notes: voucher.narration,
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: voucher,
        },
        { upsert: true, new: true }
      );
      results.succeeded++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ voucherNumber: voucher.voucherNumber, error: error.message });
      console.error(`[TallySync] Payment sync error for ${voucher.voucherNumber}:`, error.message);
    }
  }

  // Update invoice payment statuses
  await reconcilePaymentStatus();

  return results;
}

// ---------------------------------------------------------------------------
// Reconcile invoice payment status from Receipt vouchers
// ---------------------------------------------------------------------------
async function reconcilePaymentStatus() {
  await connectDB();
  const TallyInvoice = getTallyInvoice();
  const TallyPayment = getTallyPayment();
  const TallyCustomer = getTallyCustomer();

  try {
    // Group payments by customer
    const paymentsByCustomer = await TallyPayment.aggregate([
      {
        $group: {
          _id: '$tallyCustomerId',
          totalPaid: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
        },
      },
    ]);

    for (const pg of paymentsByCustomer) {
      const customerId = pg._id;
      const totalPaid = round2(pg.totalPaid);

      // Find all invoices for this customer (sorted by date)
      const invoices = await TallyInvoice.find({ tallyCustomerId: customerId })
        .sort({ date: 1 })
        .lean();

      // Allocate payments to invoices (oldest first — FIFO)
      let remainingPayment = totalPaid;
      for (const inv of invoices) {
        const invDoc = inv as any;
        const invoiceTotal = round2(invDoc.total || 0);

        if (remainingPayment >= invoiceTotal) {
          // Fully paid
          await TallyInvoice.updateOne(
            { _id: invDoc._id },
            {
              paymentStatus: 'paid',
              paidAmount: invoiceTotal,
              pendingAmount: 0,
            }
          );
          remainingPayment = round2(remainingPayment - invoiceTotal);
        } else if (remainingPayment > 0) {
          // Partially paid
          await TallyInvoice.updateOne(
            { _id: invDoc._id },
            {
              paymentStatus: 'partial',
              paidAmount: remainingPayment,
              pendingAmount: round2(invoiceTotal - remainingPayment),
            }
          );
          remainingPayment = 0;
        } else {
          // Unpaid
          await TallyInvoice.updateOne(
            { _id: invDoc._id },
            {
              paymentStatus: 'unpaid',
              paidAmount: 0,
              pendingAmount: invoiceTotal,
            }
          );
        }
      }

      // Update customer financial summary
      const customerInvoices = await TallyInvoice.aggregate([
        { $match: { tallyCustomerId: customerId } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$total' },
            totalPaid: { $sum: '$paidAmount' },
            totalPending: { $sum: '$pendingAmount' },
            totalInvoices: { $sum: 1 },
          },
        },
      ]);

      if (customerInvoices.length > 0) {
        const summary = customerInvoices[0];
        await TallyCustomer.updateOne(
          { tallyId: customerId },
          {
            totalInvoices: summary.totalInvoices,
            totalAmount: round2(summary.totalAmount),
            totalPaid: round2(summary.totalPaid),
            totalPending: round2(summary.totalPending),
          }
        );
      }
    }
  } catch (error) {
    console.error('[TallySync] Reconciliation error:', error);
  }
}

// ---------------------------------------------------------------------------
// Legacy: Sync from raw data (CSV fallback)
// ---------------------------------------------------------------------------
export async function syncTallyCustomers(rawCustomers: TallyRawCustomer[]) {
  await connectDB();
  const TallyCustomer = getTallyCustomer();
  const results = { succeeded: 0, failed: 0, errors: [] as any[] };

  for (const customer of rawCustomers) {
    try {
      await TallyCustomer.findOneAndUpdate(
        { tallyId: customer.id },
        {
          tallyId: customer.id,
          tallyName: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          state: customer.state,
          gstin: customer.gstin,
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: customer,
        },
        { upsert: true, new: true }
      );
      results.succeeded++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ customerId: customer.id, error: error.message });
    }
  }

  return results;
}

export async function syncTallyInvoices(rawInvoices: TallyRawInvoice[]) {
  await connectDB();
  const TallyInvoice = getTallyInvoice();
  const TallyCustomer = getTallyCustomer();
  const results = { succeeded: 0, failed: 0, errors: [] as any[] };

  for (const invoice of rawInvoices) {
    try {
      const linkedCustomer = await TallyCustomer.findOne({ tallyId: invoice.customerId });

      // Validate amounts
      const subtotal = round2(Number(invoice.subtotal) || 0);
      const gst = round2(Number(invoice.gst) || 0);
      const total = round2(Number(invoice.total) || 0);
      const paidAmount = round2(Number(invoice.paidAmount) || 0);
      const pendingAmount = round2(total - paidAmount);

      // Determine payment status from amounts (not from raw data which may be wrong)
      let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
      if (paidAmount >= total && total > 0) paymentStatus = 'paid';
      else if (paidAmount > 0) paymentStatus = 'partial';

      await TallyInvoice.findOneAndUpdate(
        { tallyId: invoice.id },
        {
          tallyId: invoice.id,
          tallyInvoiceNumber: invoice.invoiceNumber,
          tallyCustomerId: invoice.customerId,
          linkedCustomerId: linkedCustomer?._id,
          date: new Date(invoice.date),
          dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
          lineItems: (invoice.lineItems || []).map(item => ({
            ...item,
            amount: round2(item.quantity * item.rate),
          })),
          subtotal,
          gst,
          total,
          paymentStatus,
          paidAmount,
          pendingAmount,
          notes: invoice.notes,
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: invoice,
        },
        { upsert: true, new: true }
      );
      results.succeeded++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ invoiceId: invoice.id, error: error.message });
    }
  }

  return results;
}

export async function syncTallyPayments(rawPayments: TallyRawPayment[]) {
  await connectDB();
  const TallyPayment = getTallyPayment();
  const TallyInvoice = getTallyInvoice();
  const results = { succeeded: 0, failed: 0, errors: [] as any[] };

  for (const payment of rawPayments) {
    try {
      let linkedInvoiceIds: string[] = [];
      if (payment.invoiceIds && payment.invoiceIds.length > 0) {
        const invoices = await TallyInvoice.find({ tallyId: { $in: payment.invoiceIds } });
        linkedInvoiceIds = invoices.map(inv => inv._id.toString());
      }

      await TallyPayment.findOneAndUpdate(
        { tallyId: payment.id },
        {
          tallyId: payment.id,
          tallyPaymentVoucher: payment.voucherNumber,
          tallyCustomerId: payment.customerId,
          tallyInvoiceIds: payment.invoiceIds || [],
          linkedInvoiceIds,
          paymentDate: new Date(payment.date),
          paymentMethod: payment.method as any,
          amount: round2(Number(payment.amount) || 0),
          referenceNumber: payment.referenceNumber,
          notes: payment.notes,
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: payment,
        },
        { upsert: true, new: true }
      );
      results.succeeded++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ paymentId: payment.id, error: error.message });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Log sync activity
// ---------------------------------------------------------------------------
export async function logSyncActivity(
  syncType: 'customers' | 'invoices' | 'payments' | 'all',
  status: 'success' | 'failed' | 'partial',
  stats: {
    totalProcessed: number;
    totalSucceeded: number;
    totalFailed: number;
    errors?: any[];
    details?: any;
  }
) {
  await connectDB();
  const TallySyncLog = getTallySyncLog();

  return TallySyncLog.create({
    syncType,
    status,
    totalProcessed: stats.totalProcessed,
    totalSucceeded: stats.totalSucceeded,
    totalFailed: stats.totalFailed,
    errors: stats.errors || [],
    endTime: new Date(),
    details: stats.details,
  });
}

// ---------------------------------------------------------------------------
// Get sync statistics
// ---------------------------------------------------------------------------
export async function getTallySyncStats() {
  await connectDB();
  const TallyCustomer = getTallyCustomer();
  const TallyInvoice = getTallyInvoice();
  const TallyPayment = getTallyPayment();

  const [customerCount, invoiceCount, paymentCount, lastSync] = await Promise.all([
    TallyCustomer.countDocuments(),
    TallyInvoice.countDocuments(),
    TallyPayment.countDocuments(),
    getTallySyncLog().findOne().sort({ createdAt: -1 }),
  ]);

  // Use aggregation with proper rounding
  const totalInvoiceAmount = await TallyInvoice.aggregate([
    { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' }, pending: { $sum: '$pendingAmount' } } },
  ]);

  const totalPaymentAmount = await TallyPayment.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const invoiceStats = totalInvoiceAmount[0] || { total: 0, paid: 0, pending: 0 };
  const paymentStats = totalPaymentAmount[0] || { total: 0 };

  return {
    customers: customerCount,
    invoices: invoiceCount,
    payments: paymentCount,
    totalInvoiceAmount: round2(invoiceStats.total),
    totalPaidAmount: round2(invoiceStats.paid),
    totalPendingAmount: round2(invoiceStats.pending),
    totalPaymentAmount: round2(paymentStats.total),
    // Cross-check: payment total should match invoice paid total
    reconciliationDiff: round2(paymentStats.total - invoiceStats.paid),
    lastSync: lastSync?.createdAt || null,
  };
}
