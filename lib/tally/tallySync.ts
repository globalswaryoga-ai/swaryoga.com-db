/**
 * Tally Prime Sync Utilities
 * Handles syncing data from Tally Prime to MongoDB
 * 
 * Usage:
 * - Manually: curl http://localhost:3000/api/tally/sync?type=all&token=YOUR_TOKEN
 * - Scheduled: Configure cron job to call this endpoint nightly
 */

import { connectDB } from '@/lib/db';
import { getTallyCustomer, getTallyInvoice, getTallyPayment, getTallySyncLog } from '@/lib/schemas/enterpriseSchemas';

// Export these functions so they can be imported in API routes
export interface TallySyncConfig {
  tallyDataPath?: string; // Path to Tally data folder (e.g., /Users/mohan/Tally/Data)
  tallyApiUrl?: string; // If using Tally API (optional)
  syncInterval?: number; // Minutes between syncs
}

/**
 * Interface for data coming from Tally
 * (This will depend on how you export data from Tally - CSV, JSON, or API)
 */
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

/**
 * Sync customers from Tally to MongoDB
 */
export async function syncTallyCustomers(rawCustomers: TallyRawCustomer[]) {
  await connectDB();
  const TallyCustomer = getTallyCustomer();
  const results = { succeeded: 0, failed: 0, errors: [] as any[] };

  for (const customer of rawCustomers) {
    try {
      const existingCustomer = await TallyCustomer.findOne({ tallyId: customer.id });

      if (existingCustomer) {
        // Update existing
        await TallyCustomer.updateOne(
          { tallyId: customer.id },
          {
            tallyName: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            state: customer.state,
            gstin: customer.gstin,
            lastSyncedAt: new Date(),
            syncStatus: 'success',
            tallyRawData: customer,
          }
        );
      } else {
        // Create new
        await TallyCustomer.create({
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
        });
      }
      results.succeeded++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({
        customerId: customer.id,
        error: error.message,
      });
      console.error(`[Tally Sync] Error syncing customer ${customer.id}:`, error);
    }
  }

  return results;
}

/**
 * Sync invoices from Tally to MongoDB
 */
export async function syncTallyInvoices(rawInvoices: TallyRawInvoice[]) {
  await connectDB();
  const TallyInvoice = getTallyInvoice();
  const TallyCustomer = getTallyCustomer();
  const results = { succeeded: 0, failed: 0, errors: [] as any[] };

  for (const invoice of rawInvoices) {
    try {
      // Find linked customer
      const linkedCustomer = await TallyCustomer.findOne({ tallyId: invoice.customerId });

      const existingInvoice = await TallyInvoice.findOne({ tallyId: invoice.id });

      if (existingInvoice) {
        // Update existing
        await TallyInvoice.updateOne(
          { tallyId: invoice.id },
          {
            tallyInvoiceNumber: invoice.invoiceNumber,
            tallyCustomerId: invoice.customerId,
            linkedCustomerId: linkedCustomer?._id,
            date: new Date(invoice.date),
            dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
            lineItems: invoice.lineItems || [],
            subtotal: invoice.subtotal,
            gst: invoice.gst,
            total: invoice.total,
            paymentStatus: invoice.paymentStatus,
            paidAmount: invoice.paidAmount,
            pendingAmount: invoice.total - invoice.paidAmount,
            notes: invoice.notes,
            lastSyncedAt: new Date(),
            syncStatus: 'success',
            tallyRawData: invoice,
          }
        );
      } else {
        // Create new
        await TallyInvoice.create({
          tallyId: invoice.id,
          tallyInvoiceNumber: invoice.invoiceNumber,
          tallyCustomerId: invoice.customerId,
          linkedCustomerId: linkedCustomer?._id,
          date: new Date(invoice.date),
          dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
          lineItems: invoice.lineItems || [],
          subtotal: invoice.subtotal,
          gst: invoice.gst,
          total: invoice.total,
          paymentStatus: invoice.paymentStatus,
          paidAmount: invoice.paidAmount,
          pendingAmount: invoice.total - invoice.paidAmount,
          notes: invoice.notes,
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: invoice,
        });
      }
      results.succeeded++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({
        invoiceId: invoice.id,
        error: error.message,
      });
      console.error(`[Tally Sync] Error syncing invoice ${invoice.id}:`, error);
    }
  }

  return results;
}

/**
 * Sync payments from Tally to MongoDB
 */
export async function syncTallyPayments(rawPayments: TallyRawPayment[]) {
  await connectDB();
  const TallyPayment = getTallyPayment();
  const TallyInvoice = getTallyInvoice();
  const results = { succeeded: 0, failed: 0, errors: [] as any[] };

  for (const payment of rawPayments) {
    try {
      // Find linked invoices
      let linkedInvoiceIds: string[] = [];
      if (payment.invoiceIds && payment.invoiceIds.length > 0) {
        const invoices = await TallyInvoice.find({
          tallyId: { $in: payment.invoiceIds },
        });
        linkedInvoiceIds = invoices.map(inv => inv._id.toString());
      }

      const existingPayment = await TallyPayment.findOne({ tallyId: payment.id });

      if (existingPayment) {
        // Update existing
        await TallyPayment.updateOne(
          { tallyId: payment.id },
          {
            tallyPaymentVoucher: payment.voucherNumber,
            tallyCustomerId: payment.customerId,
            tallyInvoiceIds: payment.invoiceIds || [],
            linkedInvoiceIds,
            paymentDate: new Date(payment.date),
            paymentMethod: payment.method as any,
            amount: payment.amount,
            referenceNumber: payment.referenceNumber,
            notes: payment.notes,
            lastSyncedAt: new Date(),
            syncStatus: 'success',
            tallyRawData: payment,
          }
        );
      } else {
        // Create new
        await TallyPayment.create({
          tallyId: payment.id,
          tallyPaymentVoucher: payment.voucherNumber,
          tallyCustomerId: payment.customerId,
          tallyInvoiceIds: payment.invoiceIds || [],
          linkedInvoiceIds,
          paymentDate: new Date(payment.date),
          paymentMethod: payment.method as any,
          amount: payment.amount,
          referenceNumber: payment.referenceNumber,
          notes: payment.notes,
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          tallyRawData: payment,
        });
      }
      results.succeeded++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({
        paymentId: payment.id,
        error: error.message,
      });
      console.error(`[Tally Sync] Error syncing payment ${payment.id}:`, error);
    }
  }

  return results;
}

/**
 * Log sync activity
 */
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

/**
 * Get sync statistics
 */
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

  const totalInvoiceAmount = await TallyInvoice.aggregate([
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);

  const totalPaymentAmount = await TallyPayment.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return {
    customers: customerCount,
    invoices: invoiceCount,
    payments: paymentCount,
    totalInvoiceAmount: totalInvoiceAmount[0]?.total || 0,
    totalPaymentAmount: totalPaymentAmount[0]?.total || 0,
    lastSync: lastSync?.createdAt || null,
  };
}
