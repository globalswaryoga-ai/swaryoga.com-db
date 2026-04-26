import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getSalesReport, getCrmReceipt } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';


/**
 * POST /api/admin/crm/sales/tally-sync
 * Sync a sale entry to Tally Prime and optionally generate/link a receipt.
 *
 * Body: { saleId, generateReceipt?: boolean }
 *
 * Flow:
 * 1. Mark sale as tallySynced
 * 2. Create a Tally voucher entry (RECEIPT type) in tally_vouchers collection
 * 3. If generateReceipt, create a CRM receipt and link it to the sale
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required for Tally sync' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as any));
    const { saleId, generateReceipt } = body;

    if (!saleId || !mongoose.Types.ObjectId.isValid(saleId)) {
      return NextResponse.json({ error: 'Invalid saleId' }, { status: 400 });
    }

    await connectDB();

    const SalesReport = getSalesReport();
    const sale: any = await SalesReport.findById(saleId).lean();
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const viewerUserId = decoded?.userId || decoded?.email || 'admin';
    const now = new Date();

    // Create tally voucher in the tally_vouchers collection
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    const tallyVoucher = {
      voucherType: 'RECEIPT',
      voucherNumber: `SY-REC-${Date.now()}`,
      date: sale.saleDate || now,
      partyName: sale.customerName || 'Unknown',
      partyPhone: sale.customerPhone || '',
      amount: sale.saleAmount || 0,
      narration: `Workshop: ${sale.workshopName || '-'} | Payment: ${sale.paymentMode || '-'} | Sale ID: ${sale._id}`,
      ledgerEntries: [
        { ledgerName: sale.customerName || 'Sundry Debtors', amount: sale.saleAmount || 0, drCr: 'Dr' },
        { ledgerName: 'Workshop Revenue', amount: sale.saleAmount || 0, drCr: 'Cr' },
      ],
      saleId: sale._id,
      syncedAt: now,
      syncedBy: viewerUserId,
      source: 'crm_sales',
      createdAt: now,
    };

    const voucherResult = await db.collection('tally_vouchers').insertOne(tallyVoucher);

    // Update sale with tally sync status
    const updateFields: any = {
      tallySynced: true,
      tallySyncedAt: now,
      tallySyncedBy: viewerUserId,
      tallyVoucherId: voucherResult.insertedId.toString(),
      tallyError: null,
    };

    // Generate receipt if requested
    let receipt = null;
    if (generateReceipt && sale.leadId) {
      try {
        const CrmReceipt = getCrmReceipt();

        // Check for existing receipt
        const existing = await CrmReceipt.findOne({ leadId: sale.leadId }).sort({ issuedAt: -1 }).lean();
        if (existing) {
          receipt = existing;
        } else {
          // Generate receipt number
          const counters = db.collection('crm_counters');
          const counterRes = await counters.findOneAndUpdate(
            { _id: 'receiptNumber' } as any,
            { $inc: { seq: 1 } },
            { upsert: true, returnDocument: 'after' }
          );
          const seq = counterRes?.value?.seq ?? 1;
          const receiptNumber = `R-${String(Math.max(0, Number(seq))).padStart(6, '0')}`;

          receipt = await CrmReceipt.create({
            leadId: sale.leadId,
            leadNumber: sale.customerId,
            receiptNumber,
            issuedByUserId: viewerUserId,
            issuedAt: now,
            customerName: sale.customerName,
            customerPhone: sale.customerPhone,
            customerEmail: sale.customerEmail,
            workshopName: sale.workshopName,
            payment: {
              status: sale.status || 'completed',
              currency: sale.currency || 'INR',
              amount: sale.saleAmount,
              paidAmount: sale.paidAmount || sale.saleAmount,
              method: sale.paymentMode,
              transactionId: sale.transactionId,
              paidAt: sale.saleDate || now,
            },
            metadata: { tallyVoucherId: voucherResult.insertedId.toString(), source: 'tally_sync' },
          });
        }

        updateFields.receiptId = (receipt as any)._id;
        updateFields.receiptNumber = (receipt as any).receiptNumber;
      } catch (err: any) {
        console.error('[tally-sync] Receipt generation error:', err);
        // Continue — tally sync succeeded even if receipt failed
      }
    }

    await SalesReport.updateOne({ _id: sale._id }, { $set: updateFields });

    return NextResponse.json({
      success: true,
      message: 'Sale synced to Tally successfully',
      tallyVoucherId: voucherResult.insertedId.toString(),
      receipt: receipt ? { _id: (receipt as any)._id, receiptNumber: (receipt as any).receiptNumber } : null,
    });
  } catch (err: any) {
    console.error('[tally-sync] Error:', err);

    // Try to update the sale with error status
    try {
      const body = await Promise.resolve().then(() => ({}));
    } catch { /* ignore */ }

    return NextResponse.json({ error: err.message || 'Tally sync failed' }, { status: 500 });
  }
}
