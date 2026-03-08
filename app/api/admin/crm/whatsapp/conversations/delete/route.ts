import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/auth';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';
import { connectDB } from '@/lib/db';
import { WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/admin/crm/whatsapp/conversations/delete
 * Deletes chat history (WhatsAppMessage documents) for one or more conversations.
 *
 * Body: { leadIds?: string[], phoneNumbers?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    const tf = tenantFilter(decoded);

    const body = await request.json().catch(() => ({} as any));
    const leadIds: string[] = Array.isArray(body?.leadIds) ? body.leadIds.map((x: any) => String(x)) : [];
    const phoneNumbers: string[] = Array.isArray(body?.phoneNumbers)
      ? body.phoneNumbers.map((x: any) => String(x))
      : [];

    if (leadIds.length === 0 && phoneNumbers.length === 0) {
      return NextResponse.json({ error: 'Missing leadIds or phoneNumbers' }, { status: 400 });
    }

    await connectDB();

    const or: any[] = [];
    const goodLeadIds = leadIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (goodLeadIds.length) {
      or.push({ leadId: { $in: goodLeadIds.map((id) => new mongoose.Types.ObjectId(id)) } });
    }
    if (phoneNumbers.length) {
      or.push({ phoneNumber: { $in: phoneNumbers } });
    }

    if (or.length === 0) {
      return NextResponse.json({ error: 'No valid leadIds/phoneNumbers' }, { status: 400 });
    }

    // Delete messages. This is irreversible.
    // Access-control note: This currently allows any admin to delete; if you want to restrict to admincrm only,
    // we can tighten this check.
    const res = await (WhatsAppMessage as any).deleteMany({ $or: or, ...tf });

    return NextResponse.json(
      {
        success: true,
        data: {
          deletedCount: Number(res?.deletedCount || 0),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete conversations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
