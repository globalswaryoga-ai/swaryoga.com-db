import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId, generateInvoiceNumber } from '@/lib/crm-handlers';
import { Lead, CrmReceipt, getSalesReport } from '@/lib/schemas/enterpriseSchemas';

// Builds the payment/workshop snapshot for a receipt from the actual sale
// record (SalesReport), which is the source of truth for amounts — the
// Lead's embedded `sales` field is often left empty for sales recorded
// directly on the admin Sales page (manual entries, CSV/bank-PDF imports).
function paymentSnapshotFromSale(sale: any) {
  return {
    status: sale.status || 'completed',
    currency: sale.currency || 'INR',
    amount: sale.saleAmount,
    paidAmount: sale.paidAmount ?? sale.saleAmount,
    method: sale.paymentMode,
    transactionId: sale.transactionId,
    paidAt: sale.saleDate,
  };
}

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url


export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });

    const url = new URL(request.url);
    const leadId = url.searchParams.get('leadId');
    const receiptId = url.searchParams.get('id');
    const saleId = url.searchParams.get('saleId');

    if (!leadId && !receiptId) {
      return NextResponse.json({ error: 'Missing leadId or id' }, { status: 400 });
    }

    await connectDB();

    if (receiptId) {
      if (!mongoose.Types.ObjectId.isValid(receiptId)) {
        return NextResponse.json({ error: 'Invalid receipt id' }, { status: 400 });
      }
      const rec = await (CrmReceipt as any).findById(receiptId).lean();
      if (!rec) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: rec }, { status: 200 });
    }

    if (!mongoose.Types.ObjectId.isValid(leadId!)) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    // A lead can have multiple sales. When the caller knows which sale it's
    // previewing, only return that sale's own receipt -- never a sibling
    // sale's receipt under the same lead.
    if (saleId && mongoose.Types.ObjectId.isValid(saleId)) {
      const SalesReport = getSalesReport();
      const sale: any = await SalesReport.findById(saleId).select('receiptId').lean();
      let rec: any = null;
      if (sale?.receiptId) {
        rec = await (CrmReceipt as any).findById(sale.receiptId).lean();
      }
      if (!rec) {
        rec = await (CrmReceipt as any).findOne({ saleId: new mongoose.Types.ObjectId(saleId) }).sort({ issuedAt: -1 }).lean();
      }
      return NextResponse.json({ success: true, data: rec ? [rec] : [] }, { status: 200 });
    }

    const receipts = await (CrmReceipt as any)
      .find({ leadId: new mongoose.Types.ObjectId(leadId!) })
      .sort({ issuedAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ success: true, data: receipts }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load receipts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as any));
    const leadId = String(body?.leadId || '').trim();
    const saleId = String(body?.saleId || '').trim();
    const force = Boolean(body?.force);

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    await connectDB();

    const lead: any = await (Lead as any).findById(leadId).lean();
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // The actual sale record (SalesReport) is the source of truth for amounts.
    // Prefer the exact sale the admin clicked from; otherwise fall back to the
    // most recent sale recorded against this lead.
    const SalesReport = getSalesReport();
    let sale: any = null;
    if (saleId && mongoose.Types.ObjectId.isValid(saleId)) {
      sale = await SalesReport.findById(saleId).lean();
    }
    if (!sale) {
      sale = await SalesReport.findOne({ leadId: new mongoose.Types.ObjectId(leadId) }).sort({ saleDate: -1 }).lean();
    }

    // If a receipt exists already for THIS specific sale, reuse it — unless
    // it's stale (missing the amount a real sale has) or the caller asked to
    // regenerate. A lead can have multiple sales, so this must never fall
    // back to "any receipt under this lead" -- that would show one sale's
    // receipt when previewing a different sale of the same customer.
    let existing: any = null;
    if (sale?.receiptId) {
      existing = await (CrmReceipt as any).findById(sale.receiptId).lean();
    }
    if (!existing && sale?._id) {
      existing = await (CrmReceipt as any).findOne({ saleId: sale._id }).sort({ issuedAt: -1 }).lean();
    }
    if (!existing && !sale) {
      // No sale at all (manual receipt, not tied to a SalesReport) -- fall
      // back to the lead's latest receipt, the old behavior.
      existing = await (CrmReceipt as any).findOne({ leadId: new mongoose.Types.ObjectId(leadId) }).sort({ issuedAt: -1 }).lean();
    }
    // Backfill saleId on receipts created before this field existed, so
    // future lookups can match directly without going through sale.receiptId.
    if (existing && sale?._id && !existing.saleId) {
      await (CrmReceipt as any).updateOne({ _id: existing._id }, { $set: { saleId: sale._id } });
    }
    const existingIsStale = Boolean(existing) && !existing!.payment?.amount && Boolean(sale?.saleAmount);
    if (existing && !force && !existingIsStale) {
      return NextResponse.json({ success: true, data: existing, message: 'Existing receipt returned' }, { status: 200 });
    }

    const workshop = lead?.sales?.workshop || {};
    const payment = sale ? paymentSnapshotFromSale(sale) : (lead?.sales?.payment || {});
    const workshopName = sale?.workshopName || lead.workshopName || lead?.sales?.workshopName;

    let receipt: any;
    if (existing && existingIsStale) {
      receipt = await (CrmReceipt as any).findByIdAndUpdate(
        existing._id,
        { $set: { workshopName, payment } },
        { new: true }
      ).lean();
    } else {
      // Reuse the sale's own receipt number (YYMMSWNNN, assigned at creation)
      // instead of minting a different one — the sale record is the source
      // of truth for what receipt number a customer was already given.
      const receiptNumber = sale?.receiptNumber || await generateInvoiceNumber();
      receipt = await (CrmReceipt as any).create({
        leadId: new mongoose.Types.ObjectId(leadId),
        leadNumber: lead.leadNumber,
        ...(sale?._id ? { saleId: sale._id } : {}),
        receiptNumber,
        issuedByUserId: viewerUserId,
        issuedAt: new Date(),
        customerName: sale?.customerName || lead.name || lead.userName,
        customerPhone: sale?.customerPhone || lead.phoneNumber,
        customerEmail: sale?.customerEmail || lead.email,
        workshopName,
        workshopSlug: workshop.slug,
        scheduleId: workshop.scheduleId,
        payment,
        metadata: {
          leadSnapshot: {
            source: lead.source,
            labels: lead.labels,
            assignedToUserId: lead.assignedToUserId,
          },
        },
      });

      await (Lead as any).updateOne(
        { _id: new mongoose.Types.ObjectId(leadId) },
        { $set: { lastReceiptId: receipt._id } }
      );
    }

    if (sale?._id) {
      await SalesReport.updateOne(
        { _id: sale._id },
        { $set: { receiptId: receipt._id, receiptNumber: receipt.receiptNumber } }
      );
    }

    return NextResponse.json({ success: true, data: receipt }, { status: existing ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create receipt';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
