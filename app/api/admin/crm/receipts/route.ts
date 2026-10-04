import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { isSuperAdmin, getViewerUserId, generateInvoiceNumber } from '@/lib/crm-handlers';
import { formatPersonName } from '@/lib/formatName';
import { getBunnyReceiptById, getBunnyReceiptBySaleId, getBunnyReceiptsByLeadId, getBunnyReceiptByLeadId, createBunnyReceipt, updateBunnyReceipt } from '@/lib/bunnyReceiptRepository';
import { getBunnySaleById, getBunnySaleByLeadId, updateBunnySale, createBunnySale } from '@/lib/bunnySalesRepository';
import { getBunnyLeadById, saveBunnyLead } from '@/lib/bunnyLeadsRepository';

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

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
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

    if (receiptId) {
      const rec = await getBunnyReceiptById(receiptId);
      if (!rec) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: rec }, { status: 200 });
    }

    if (!leadId) {
      return NextResponse.json({ error: 'Missing lead id' }, { status: 400 });
    }

    // A lead can have multiple sales. When the caller knows which sale it's
    // previewing, only return that sale's own receipt -- never a sibling
    // sale's receipt under the same lead.
    if (saleId) {
      const sale: any = await getBunnySaleById(saleId);
      let rec: any = null;
      if (sale?.receiptId) {
        rec = await getBunnyReceiptById(sale.receiptId);
      }
      if (!rec) {
        rec = await getBunnyReceiptBySaleId(saleId);
      }
      return NextResponse.json({ success: true, data: rec ? [rec] : [] }, { status: 200 });
    }

    const receipts = await getBunnyReceiptsByLeadId(leadId!, 50);

    return NextResponse.json({ success: true, data: receipts }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load receipts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as any));
    let leadId = String(body?.leadId || '').trim();
    let saleId = String(body?.saleId || '').trim();
    const force = Boolean(body?.force);

    if (!leadId) {
      leadId = Math.random().toString(36).substring(2, 15); // Auto-generate for offline forms
    }

    let lead: any = await getBunnyLeadById(leadId);
    let isVirtualLead = false;
    if (!lead) {
      isVirtualLead = true;
      lead = {
        _id: leadId, // Set ID so it can be saved to BunnyLeads later
        createdByUserId: viewerUserId,
        name: body.customerName,
        userName: body.customerName,
        phoneNumber: body.customerPhone,
        email: body.customerEmail,
        leadNumber: String(leadId).substring(0, 8).toUpperCase(),
        workshopName: body.workshopName,
        sales: { payment: body.payment, workshop: { slug: '', scheduleId: '' } },
        source: 'offline_form'
      };
    }

    // The actual sale record (SalesReport) is the source of truth for amounts.
    // Prefer the exact sale the admin clicked from; otherwise fall back to the
    // most recent sale recorded against this lead.
    let sale: any = null;
    if (saleId) {
      sale = await getBunnySaleById(saleId);
    }
    if (!sale) {
      sale = await getBunnySaleByLeadId(leadId);
    }
    
    // Auto-create a sale if this is a brand new virtual lead from an offline form
    if (!sale && isVirtualLead) {
      sale = await createBunnySale({
        leadId: leadId,
        reportedByUserId: viewerUserId,
        userId: viewerUserId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        saleAmount: Number(body.payment?.amount || 0),
        paymentMode: body.payment?.method || '',
        workshopName: body.workshopName,
        saleDate: new Date().toISOString()
      });
    }

    // If a receipt exists already for THIS specific sale, reuse it — unless
    // it's stale (missing the amount a real sale has) or the caller asked to
    // regenerate. A lead can have multiple sales, so this must never fall
    // back to "any receipt under this lead" -- that would show one sale's
    // receipt when previewing a different sale of the same customer.
    let existing: any = null;
    if (sale?.receiptId) {
      existing = await getBunnyReceiptById(sale.receiptId);
    }
    if (!existing && sale?._id) {
      existing = await getBunnyReceiptBySaleId(sale._id);
    }
    if (!existing && !sale) {
      // No sale at all (manual receipt, not tied to a SalesReport) -- fall
      // back to the lead's latest receipt, the old behavior.
      existing = await getBunnyReceiptByLeadId(leadId);
    }
    // Backfill saleId on receipts created before this field existed, so
    // future lookups can match directly without going through sale.receiptId.
    if (existing && sale?._id && !existing.saleId) {
      await updateBunnyReceipt(existing._id, { saleId: sale._id });
    }
    // Receipt number, issue date and payment/financial data are an
    // immutable snapshot by design (audit trail — see below). Contact info
    // like the customer's name isn't financial data though, and a lead-name
    // correction (typo fix, etc.) made after the receipt was first issued
    // should show up next time the receipt is viewed, not stay frozen.
    const currentName = formatPersonName(sale?.customerName || lead.name || lead.userName);
    const nameIsStale = Boolean(existing) && Boolean(currentName) && existing!.customerName !== currentName;
    const existingIsStale = Boolean(existing) && ((!existing!.payment?.amount && Boolean(sale?.saleAmount)) || nameIsStale);
    if (existing && !force && !existingIsStale) {
      return NextResponse.json({ success: true, data: existing, message: 'Existing receipt returned' }, { status: 200 });
    }

    const workshop = lead?.sales?.workshop || {};
    const payment = sale ? paymentSnapshotFromSale(sale) : (lead?.sales?.payment || {});
    const workshopName = sale?.workshopName || lead.workshopName || lead?.sales?.workshopName;

    let receipt: any;
    if (existing && existingIsStale) {
      receipt = await updateBunnyReceipt(existing._id, { workshopName, payment, customerName: currentName });
    } else {
      // Reuse the sale's own receipt number (YYMMSWNNN, assigned at creation)
      // instead of minting a different one — the sale record is the source
      // of truth for what receipt number a customer was already given.
      const receiptNumber = sale?.receiptNumber || await generateInvoiceNumber();
      receipt = await createBunnyReceipt({
        leadId: leadId,
        leadNumber: lead.leadNumber,
        ...(sale?._id ? { saleId: sale._id } : {}),
        receiptNumber,
        issuedByUserId: viewerUserId,
        issuedAt: new Date().toISOString(),
        customerName: currentName,
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

      if (lead._id) {
        await saveBunnyLead({ ...lead, lastReceiptId: receipt._id });
      }
    }

    if (sale?._id) {
      await updateBunnySale(sale._id, { receiptId: receipt._id, receiptNumber: receipt.receiptNumber });
    }

    return NextResponse.json({ success: true, data: receipt }, { status: existing ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create receipt';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
