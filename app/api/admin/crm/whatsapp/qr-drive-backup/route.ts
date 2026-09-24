import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { decryptCredential } from '@/lib/encryption';
import { getQrWhatsappDriveConnection } from '@/lib/schemas/enterpriseSchemas';
import { refreshAccessToken, ensureDriveFolder, upsertFileInDriveFolder } from '@/lib/googleDriveSync';
import { buildChatHistoryExport, renderChatHistoryHtml } from '@/lib/qrWhatsappChatExport';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/admin/crm/whatsapp/qr-drive-backup
 * Manual "Backup Now" — pushes the tenant's full current chat export to
 * their already-connected Google Drive immediately, instead of waiting for
 * the nightly archive cron to mirror it.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const DriveConn = getQrWhatsappDriveConnection();
    const conn = await DriveConn.findOne({ userId: decoded.userId }).lean();
    if (!conn) {
      return NextResponse.json({ error: 'Google Drive is not connected yet' }, { status: 400 });
    }
    if ((conn as any).needsReconnect) {
      return NextResponse.json({ error: 'Your Drive connection expired — please reconnect.' }, { status: 409 });
    }
    if (!(conn as any).connectedPhone) {
      return NextResponse.json({ error: 'No connected WhatsApp number found for this account' }, { status: 400 });
    }

    let accessToken: string;
    try {
      accessToken = await refreshAccessToken(decryptCredential((conn as any).refreshToken));
    } catch (refreshErr: any) {
      await DriveConn.updateOne(
        { userId: decoded.userId },
        { $set: { needsReconnect: true, lastError: refreshErr?.message || 'Token refresh failed' } }
      );
      return NextResponse.json({ error: 'Your Drive connection expired — please reconnect.' }, { status: 409 });
    }

    const connectedPhone = (conn as any).connectedPhone;
    const folderId = (conn as any).folderId || (await ensureDriveFolder(accessToken));

    const { chats, truncated, totalMessages } = await buildChatHistoryExport(decoded.userId, connectedPhone);
    const html = renderChatHistoryHtml(connectedPhone, chats, truncated);
    const { webViewLink } = await upsertFileInDriveFolder(
      accessToken,
      folderId,
      `whatsapp-chat-history-${connectedPhone}.html`,
      Buffer.from(html, 'utf-8'),
      'text/html'
    );

    await DriveConn.updateOne(
      { userId: decoded.userId },
      { $set: { lastSyncedAt: new Date(), lastError: '', folderId } }
    );

    return NextResponse.json({ success: true, webViewLink, totalMessages, chatsCount: chats.length });
  } catch (error: any) {
    console.error('[QR Drive Backup] Error:', error);
    return NextResponse.json({ error: error?.message || 'Backup failed' }, { status: 500 });
  }
}
