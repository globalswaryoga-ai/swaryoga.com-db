import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { buildChatHistoryExport, renderChatHistoryHtml } from '@/lib/qrWhatsappChatExport';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/admin/crm/whatsapp/qr-chat-export
 * On-demand download of the requesting tenant's own QR WhatsApp chat
 * history (hot Mongo + Bunny archive merged) as a self-contained HTML file.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length) ||
                  request.nextUrl.searchParams.get('token');
    const decoded = verifyToken(token || undefined);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const CRMUserSettings = getCRMUserSettings();
    const settings = await CRMUserSettings.findOne({ userId: decoded.userId }, { qrConnectedPhoneNumber: 1 }).lean();
    const connectedPhone = (settings as any)?.qrConnectedPhoneNumber || '';
    if (!connectedPhone) {
      return NextResponse.json({ error: 'No connected WhatsApp number found' }, { status: 400 });
    }

    const { chats, truncated } = await buildChatHistoryExport(decoded.userId, connectedPhone);
    const html = renderChatHistoryHtml(connectedPhone, chats, truncated);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="whatsapp-chat-history-${connectedPhone}-${new Date().toISOString().slice(0, 10)}.html"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
