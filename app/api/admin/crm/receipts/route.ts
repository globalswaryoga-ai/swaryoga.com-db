import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead, CrmReceipt } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url


function getViewerUserId(decoded: any): string {
  return decoded?.userId || decoded?.email || '';
}

function isSuperAdmin(decoded: any): boolean {
  if (!decoded?.isAdmin && !decoded?.userId) return false;
  if (decoded?.userId === 'admin') return true;
  const perms: string[] = Array.isArray(decoded?.permissions) ? decoded.permissions : [];
  return perms.includes('all');
}

function nextReceiptNumber(seq: number): string {
  // Example: R-000123
  const n = String(Math.max(0, seq)).padStart(6, '0');
  return `R-${n}`;
}

async function allocReceiptNumber(): Promise<string> {
  // Use a dedicated counter document in CRM db.
  // We intentionally avoid importing CrmCounter to keep this route self-contained.
  // This uses the same CRM DB connection (connectDB + enterpriseSchemas useDb).
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm', { useCache: true });
  const counters = db.collection<{ _id: string; seq: number }>('crm_counters');
  const res = await counters.findOneAndUpdate(
    { _id: 'receiptNumber' } as any,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const seq = res?.value?.seq ?? 1;
  return nextReceiptNumber(Number(seq));
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });

    const url = new URL(request.url);
    const leadId = url.searchParams.get('leadId');
    const receiptId = url.searchParams.get('id');

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
    const force = Boolean(body?.force);

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    await connectDB();

    const lead: any = await (Lead as any).findById(leadId).lean();
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // If a receipt exists for this lead recently, reuse unless force.
    if (!force) {
      const existing = await (CrmReceipt as any)
        .findOne({ leadId: new mongoose.Types.ObjectId(leadId) })
        .sort({ issuedAt: -1 })
        .lean();
      if (existing) {
        return NextResponse.json({ success: true, data: existing, message: 'Existing receipt returned' }, { status: 200 });
      }
    }

    const receiptNumber = await allocReceiptNumber();

    const payment = lead?.sales?.payment || {};
    const workshop = lead?.sales?.workshop || {};

    const created = await (CrmReceipt as any).create({
      leadId: new mongoose.Types.ObjectId(leadId),
      leadNumber: lead.leadNumber,
      receiptNumber,
      issuedByUserId: viewerUserId,
      issuedAt: new Date(),
      customerName: lead.name || lead.userName,
      customerPhone: lead.phoneNumber,
      customerEmail: lead.email,
      workshopName: lead.workshopName || lead?.sales?.workshopName,
      workshopSlug: workshop.slug,
      scheduleId: workshop.scheduleId,
      payment: {
        status: payment.status,
        currency: payment.currency,
        amount: payment.amount,
        paidAmount: payment.paidAmount,
        method: payment.method,
        provider: payment.provider,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt,
      },
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
      { $set: { lastReceiptId: created._id } }
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create receipt';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
