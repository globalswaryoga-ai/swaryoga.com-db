import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { QRBackupService } from '@/lib/qrBackupService';

export const dynamic = 'force-dynamic';

interface BackupTriggerRequest {
  action: 'backup' | 'restore' | 'cleanup';
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const db = (global as any).mongoClient?.db('swaryoga_admin_crm');
    if (!db) return NextResponse.json({ error: 'Database not connected' }, { status: 500 });

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (decoded as any).userId || (decoded as any).id;
    const { action } = (await request.json()) as BackupTriggerRequest;

    const backupService = new QRBackupService(db);

    // Get user account to get retention settings
    const userAccount = await db.collection('qr_user_accounts').findOne({ _id: userId });
    if (!userAccount) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    switch (action) {
      case 'backup': {
        // Create new backup
        const backupId = await backupService.createBackup({
          userId,
          email: userAccount.email,
          googleDriveId: userAccount.googleDriveId,
          retentionDays: userAccount.retentionDays || 730,
        });

        // Get backup data
        const chats = await backupService.getChatData(userId);
        const messages = await backupService.getMessageData(userId, 5000);
        const contacts = await backupService.getContactData(userId);

        // Update backup status
        await backupService.updateBackupStatus(backupId, 'completed', {
          'itemsCount.chats': chats.length,
          'itemsCount.messages': messages.length,
          'itemsCount.contacts': contacts.length,
          'storageUsedMB': JSON.stringify({ chats, messages, contacts }).length / (1024 * 1024),
        });

        return NextResponse.json({
          success: true,
          message: 'Backup completed',
          backupId,
          itemsCount: {
            chats: chats.length,
            messages: messages.length,
            contacts: contacts.length,
          },
        }, { status: 200 });
      }

      case 'cleanup': {
        // Cleanup old backups
        const deleted = await backupService.cleanupOldBackups(
          userId,
          userAccount.retentionDays || 730
        );

        return NextResponse.json({
          success: true,
          message: `Cleaned up ${deleted} old backups`,
          deletedCount: deleted,
        }, { status: 200 });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[QR Backup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Backup operation failed' },
      { status: 500 }
    );
  }
}
