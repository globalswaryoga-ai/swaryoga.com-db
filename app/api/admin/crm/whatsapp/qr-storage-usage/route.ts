import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCRMUserSettings, getQrWhatsappStorageUsage } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/whatsapp/qr-storage-usage
 *
 * Informational only — reports how much of this tenant's QR WhatsApp chat
 * history is sitting in Bunny archive storage. There is no quota/limit here
 * and nothing is blocked based on this number; it exists purely so a tenant
 * can see how much history is retained under the 6-month archive policy.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const CRMUserSettings = getCRMUserSettings();
    const settings = await CRMUserSettings.findOne(
      { userId: decoded.userId },
      { qrConnectedPhoneNumber: 1 }
    ).lean();
    const connectedPhone = (settings as any)?.qrConnectedPhoneNumber || '';

    if (!connectedPhone) {
      return NextResponse.json({
        connectedPhone: '',
        bunnyBytes: 0,
        bunnyFileCount: 0,
        bunnyMessageCount: 0,
        lastArchivedAt: null,
        lastPurgedAt: null,
        retentionDays: 180,
      });
    }

    const Usage = getQrWhatsappStorageUsage();
    const usage = await Usage.findOne({ userId: decoded.userId, connectedPhone }).lean();

    return NextResponse.json({
      connectedPhone,
      bunnyBytes: (usage as any)?.bunnyBytes || 0,
      bunnyFileCount: (usage as any)?.bunnyFileCount || 0,
      bunnyMessageCount: (usage as any)?.bunnyMessageCount || 0,
      lastArchivedAt: (usage as any)?.lastArchivedAt || null,
      lastPurgedAt: (usage as any)?.lastPurgedAt || null,
      retentionDays: 180,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
