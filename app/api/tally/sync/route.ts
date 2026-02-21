/**
 * Tally Sync API Endpoint
 * 
 * Usage:
 * - GET /api/tally/sync?type=all&token=YOUR_TOKEN
 * - GET /api/tally/sync?type=customers&token=YOUR_TOKEN
 * - GET /api/tally/sync?type=invoices&token=YOUR_TOKEN
 * - GET /api/tally/sync?type=payments&token=YOUR_TOKEN
 * 
 * Token: Set TALLY_SYNC_TOKEN in .env.local for security
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  syncTallyCustomers,
  syncTallyInvoices,
  syncTallyPayments,
  logSyncActivity,
  getTallySyncStats,
  type TallyRawCustomer,
  type TallyRawInvoice,
  type TallyRawPayment,
} from '@/lib/tally/tallySync';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parse/sync';

// Verify sync token
function verifyToken(token: string): boolean {
  const validToken = process.env.TALLY_SYNC_TOKEN;
  if (!validToken) {
    console.warn('[Tally Sync] TALLY_SYNC_TOKEN not set in environment');
    return false;
  }
  return token === validToken;
}

/**
 * Read Tally data from CSV files
 * Expected file structure:
 * - data/tally/customers.csv
 * - data/tally/invoices.csv
 * - data/tally/payments.csv
 */
function readTallyData(type: string): any[] {
  try {
    const dataDir = path.join(process.cwd(), 'data', 'tally');
    const fileName = `${type}.csv`;
    const filePath = path.join(dataDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`[Tally Sync] File not found: ${filePath}`);
      return [];
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log(`[Tally Sync] Read ${records.length} ${type} from CSV`);
    return records;
  } catch (error) {
    console.error(`[Tally Sync] Error reading ${type} data:`, error);
    return [];
  }
}

/**
 * Sync all data from Tally
 */
async function syncAllData() {
  const results = {
    customers: { succeeded: 0, failed: 0 },
    invoices: { succeeded: 0, failed: 0 },
    payments: { succeeded: 0, failed: 0 },
    errors: [] as any[],
  };

  try {
    // Sync customers
    console.log('[Tally Sync] Starting customer sync...');
    const customers = readTallyData('customers') as TallyRawCustomer[];
    const customerResults = await syncTallyCustomers(customers);
    results.customers = customerResults;
    console.log(`[Tally Sync] Customers: ${customerResults.succeeded} succeeded, ${customerResults.failed} failed`);

    // Sync invoices
    console.log('[Tally Sync] Starting invoice sync...');
    const invoices = readTallyData('invoices') as TallyRawInvoice[];
    const invoiceResults = await syncTallyInvoices(invoices);
    results.invoices = invoiceResults;
    console.log(`[Tally Sync] Invoices: ${invoiceResults.succeeded} succeeded, ${invoiceResults.failed} failed`);

    // Sync payments
    console.log('[Tally Sync] Starting payment sync...');
    const payments = readTallyData('payments') as TallyRawPayment[];
    const paymentResults = await syncTallyPayments(payments);
    results.payments = paymentResults;
    console.log(`[Tally Sync] Payments: ${paymentResults.succeeded} succeeded, ${paymentResults.failed} failed`);

    // Log activity
    const totalSucceeded = customerResults.succeeded + invoiceResults.succeeded + paymentResults.succeeded;
    const totalFailed = customerResults.failed + invoiceResults.failed + paymentResults.failed;

    await logSyncActivity('all', totalFailed === 0 ? 'success' : 'partial', {
      totalProcessed: customers.length + invoices.length + payments.length,
      totalSucceeded,
      totalFailed,
      errors: [...(customerResults.errors || []), ...(invoiceResults.errors || []), ...(paymentResults.errors || [])],
    });

    return results;
  } catch (error) {
    console.error('[Tally Sync] Error during sync:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all'; // all | customers | invoices | payments
    const token = searchParams.get('token');

    // Verify token
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Tally Sync] Sync requested for type: ${type}`);

    let results: any = {};
    const startTime = Date.now();

    if (type === 'all') {
      results = await syncAllData();
    } else if (type === 'customers') {
      const customers = readTallyData('customers') as TallyRawCustomer[];
      results = await syncTallyCustomers(customers);
      await logSyncActivity('customers', results.failed === 0 ? 'success' : 'partial', {
        totalProcessed: customers.length,
        totalSucceeded: results.succeeded,
        totalFailed: results.failed,
        errors: results.errors,
      });
    } else if (type === 'invoices') {
      const invoices = readTallyData('invoices') as TallyRawInvoice[];
      results = await syncTallyInvoices(invoices);
      await logSyncActivity('invoices', results.failed === 0 ? 'success' : 'partial', {
        totalProcessed: invoices.length,
        totalSucceeded: results.succeeded,
        totalFailed: results.failed,
        errors: results.errors,
      });
    } else if (type === 'payments') {
      const payments = readTallyData('payments') as TallyRawPayment[];
      results = await syncTallyPayments(payments);
      await logSyncActivity('payments', results.failed === 0 ? 'success' : 'partial', {
        totalProcessed: payments.length,
        totalSucceeded: results.succeeded,
        totalFailed: results.failed,
        errors: results.errors,
      });
    } else {
      return NextResponse.json({ error: 'Invalid sync type' }, { status: 400 });
    }

    const duration = Date.now() - startTime;
    const stats = await getTallySyncStats();

    return NextResponse.json({
      success: true,
      message: `Tally sync completed for type: ${type}`,
      syncResults: results,
      durationMs: duration,
      stats,
    });
  } catch (error: any) {
    console.error('[Tally Sync] API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * For testing: POST to manually trigger sync
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, type = 'all' } = body;

    // Verify token
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reuse GET logic
    const url = new URL(request.url);
    url.searchParams.set('type', type);
    url.searchParams.set('token', token);

    const getRequest = new NextRequest(url, { method: 'GET' });
    return GET(getRequest);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
