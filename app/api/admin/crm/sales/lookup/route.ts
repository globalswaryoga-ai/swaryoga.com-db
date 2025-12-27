import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import { isValidObjectId, toObjectId } from '@/lib/crm-handlers';
import { normalizeLeadNumberInput } from '@/lib/crm/leadNumber';

function getViewerUserId(decoded: any): string {
  return String(decoded?.userId || decoded?.username || '').trim();
}

function isSuperAdmin(decoded: any): boolean {
  return (
    decoded?.userId === 'admin' ||
    (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'))
  );
}

/**
 * Lookup lead/customer info for Sales auto-fill.
 *
 * GET /api/admin/crm/sales/lookup?customerId=...
 *
 * customerId can be:
 * - Lead _id (ObjectId)
 * - Lead leadNumber (6-digit string, e.g. 006999)
 * - phone number (exact or partial)
 * - email (exact or partial)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const raw = String(url.searchParams.get('customerId') || '').trim();
    if (!raw) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    await connectDB();

    const baseFilter: any = {};
    if (!superAdmin) {
      baseFilter.assignedToUserId = viewerUserId;
    }

    let lead: any = null;

    // 0) If customerId looks like a 6-digit leadNumber (or digits up to 6), try exact match.
    const normalizedLeadNumber = normalizeLeadNumberInput(raw);
    if (normalizedLeadNumber) {
      lead = await Lead.findOne({ ...baseFilter, leadNumber: normalizedLeadNumber }).lean();
    }

    // 1) If customerId is a Lead ObjectId
    if (!lead && isValidObjectId(raw)) {
      lead = await Lead.findOne({ ...baseFilter, _id: toObjectId(raw) }).lean();
    }

    // 2) Otherwise search by phone/email/name
    if (!lead) {
      const q = raw;
      lead = await Lead.findOne({
        ...baseFilter,
        $or: [
          { phoneNumber: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
        ],
      })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean();
    }

    if (!lead) {
      return NextResponse.json({ success: true, data: { found: false } }, { status: 200 });
    }

    // Batch date is not a core Lead field. If it exists in metadata, return it.
    const meta: any = lead?.metadata && typeof lead.metadata === 'object' ? lead.metadata : {};
    const batchDate = meta?.batchDate || meta?.scheduleDate || meta?.batchStartDate || null;

    return NextResponse.json(
      {
        success: true,
        data: {
          found: true,
          leadId: String(lead._id),
          customerId: lead?.leadNumber || null,
          customerName: lead?.name || '',
          customerPhone: lead?.phoneNumber || '',
          workshopName: lead?.workshopName || '',
          batchDate,
          // If your lead metadata includes an expected amount, we pass it through.
          amount: meta?.amount || meta?.saleAmount || null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lookup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
