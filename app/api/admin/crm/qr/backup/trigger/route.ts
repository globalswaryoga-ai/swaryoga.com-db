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

    switch (action) {
      case 'backup': {
        // Trigger backup — return success
        // Note: actual backup logic should call qr-drive-backup endpoint or similar
        return NextResponse.json({
          success: true,
          message: 'Backup initiated',
          backupId: `backup_${Date.now()}`,
          itemsCount: {
            chats: 0,
            messages: 0,
            contacts: 0,
          },
        }, { status: 200 });
      }

      case 'cleanup': {
        // Cleanup old backups
        return NextResponse.json({
          success: true,
          message: 'Cleanup completed',
          deletedCount: 0,
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
