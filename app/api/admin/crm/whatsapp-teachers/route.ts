import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { getWhatsAppTeacherAccount } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/whatsapp-teachers
 * Lists connected teacher WhatsApp accounts. Super admins see all; others see only their own.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const WhatsAppTeacherAccount = getWhatsAppTeacherAccount();

    const filter: any = {};
    if (!isSuperAdmin(decoded)) {
      filter.userId = getViewerUserId(decoded) || decoded.username || decoded.userId;
    }

    const accounts = await WhatsAppTeacherAccount.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, accounts });
  } catch (error) {
    console.error('[whatsapp-teachers] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to list accounts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
