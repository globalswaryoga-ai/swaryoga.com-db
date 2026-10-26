import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, generateInvoiceNumber } from '@/lib/crm-handlers';
import { getBunnyReceiptByLeadId, createBunnyReceipt } from '@/lib/bunnyReceiptRepository';
import { getBunnySaleById, updateBunnySale } from '@/lib/bunnySalesRepository';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/sales/tally-sync
 * Sync a sale entry to Tally Prime and optionally generate/link a receipt using Bunny Database
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

    if (!saleId) {
      return NextResponse.json({ error: 'Invalid saleId' }, { status: 400 });
    }

    const sale = await getBunnySaleById(String(saleId));
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const viewerUserId = decoded?.userId || decoded?.email || 'admin';
    const now = new Date();
    const voucherId = `tv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const voucherNumber = `SY-REC-${Date.now()}`;

    // Create tally voucher in Bunny Database
    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS tally_vouchers_sql (
        document_id TEXT PRIMARY KEY,
        voucher_number TEXT,
        voucher_type TEXT,
        party_name TEXT,
        amount REAL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `).catch(() => null);

    const tallyVoucher = {
      _id: voucherId,
      id: voucherId,
      voucherType: 'RECEIPT',
      voucherNumber,
      date: sale.saleDate || now.toISOString(),
      partyName: sale.customerName || 'Unknown',
      partyPhone: sale.customerPhone || '',
      amount: sale.saleAmount || 0,
      narration: `Workshop: ${sale.workshopName || '-'} | Payment: ${sale.paymentMode || '-'} | Sale ID: ${sale._id || saleId}`,
      saleId: sale._id || saleId,
      syncedAt: now.toISOString(),
      syncedBy: viewerUserId,
      source: 'crm_sales',
      createdAt: now.toISOString(),
    };

    await bunnyExecute({
      sql: `INSERT INTO tally_vouchers_sql (document_id, voucher_number, voucher_type, party_name, amount, data_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [voucherId, voucherNumber, 'RECEIPT', String(sale.customerName || 'Unknown'), Number(sale.saleAmount || 0), JSON.stringify(tallyVoucher), now.toISOString()],
    });

    const updateFields: any = {
      tallySynced: true,
      tallySyncedAt: now.toISOString(),
      tallySyncedBy: viewerUserId,
      tallyVoucherId: voucherId,
      tallyError: null,
    };

    let receipt = null;
    if (generateReceipt && sale.leadId) {
      try {
        const existing = await getBunnyReceiptByLeadId(sale.leadId);
        if (existing) {
          receipt = existing;
        } else {
          const receiptNumber = sale.receiptNumber || await generateInvoiceNumber();

          receipt = await createBunnyReceipt({
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
            metadata: { tallyVoucherId: voucherId, source: 'tally_sync' },
          });
        }

        updateFields.receiptId = (receipt as any)._id;
        updateFields.receiptNumber = (receipt as any).receiptNumber;
      } catch (err: any) {
        console.error('[tally-sync] Receipt generation error:', err);
      }
    }

    await updateBunnySale(String(saleId), updateFields);

    return NextResponse.json({
      success: true,
      message: 'Sale synced to Tally successfully',
      tallyVoucherId: voucherId,
      receipt: receipt ? { _id: (receipt as any)._id, receiptNumber: (receipt as any).receiptNumber } : null,
    });
  } catch (err: any) {
    console.error('[tally-sync] Error:', err);
    return NextResponse.json({ error: err.message || 'Tally sync failed' }, { status: 500 });
  }
}
