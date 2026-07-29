import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { decryptCredential } from '@/lib/encryption';
import { getQrWhatsappDriveConnection } from '@/lib/schemas/enterpriseSchemas';
import { refreshAccessToken, ensureDriveFolder, upsertFileInDriveFolder } from '@/lib/googleDriveSync';
import { buildChatHistoryExport, renderChatHistoryHtml } from '@/lib/qrWhatsappChatExport';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface BackupTriggerRequest {
  action: 'backup' | 'restore' | 'cleanup';
}

/**
 * POST /api/admin/crm/qr/backup/trigger
 * "Backup Now" for the Chat Backup & Recovery panel. Runs the same per-tenant
 * Drive export as /whatsapp/qr-drive-backup — this used to read a global
 * mongoClient that is never assigned, so it always failed with
 * "Database not connected".
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId;
    const { action } = (await request.json()) as BackupTriggerRequest;

    if (action === 'cleanup') {
      // Retention purging is owned by the nightly archive cron, which deletes
      // anything past RETENTION_DAYS. Nothing to do on demand.
      return NextResponse.json({ success: true, message: 'Cleanup is handled by the nightly archive job', deletedCount: 0 });
    }

    if (action !== 'backup') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await connectDB();
    const DriveConn = getQrWhatsappDriveConnection();
    const conn = await DriveConn.findOne({ userId }).lean();

    if (!conn) {
      return NextResponse.json({ error: 'Google Drive is not connected yet' }, { status: 400 });
    }
    if ((conn as any).needsReconnect) {
      return NextResponse.json({ error: 'Your Drive connection expired — please reconnect.' }, { status: 409 });
    }
    const connectedPhone = (conn as any).connectedPhone;
    if (!connectedPhone) {
      return NextResponse.json({ error: 'No connected WhatsApp number found for this account' }, { status: 400 });
    }

    let accessToken: string;
    try {
      accessToken = await refreshAccessToken(decryptCredential((conn as any).refreshToken));
    } catch (refreshErr: any) {
      await DriveConn.updateOne(
        { userId },
        { $set: { needsReconnect: true, lastError: refreshErr?.message || 'Token refresh failed' } }
      );
      return NextResponse.json({ error: 'Your Drive connection expired — please reconnect.' }, { status: 409 });
    }

    const folderId = (conn as any).folderId || (await ensureDriveFolder(accessToken));
    const { chats, truncated, totalMessages } = await buildChatHistoryExport(userId, connectedPhone);
    const html = renderChatHistoryHtml(connectedPhone, chats, truncated);
    await upsertFileInDriveFolder(
      accessToken,
      folderId,
      `whatsapp-chat-history-${connectedPhone}.html`,
      Buffer.from(html, 'utf-8'),
      'text/html'
    );

    await DriveConn.updateOne(
      { userId },
      { $set: { lastSyncedAt: new Date(), lastError: '', folderId } }
    );

    return NextResponse.json({
      success: true,
      message: 'Backup completed',
      itemsCount: { chats: chats.length, messages: totalMessages, contacts: 0 },
    });
  } catch (error: any) {
    console.error('[QR Backup Trigger] Error:', error);
    return NextResponse.json({ error: error?.message || 'Backup operation failed' }, { status: 500 });
  }
}
