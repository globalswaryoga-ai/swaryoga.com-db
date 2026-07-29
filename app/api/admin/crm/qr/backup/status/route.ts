import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getQrWhatsappDriveConnection } from '@/lib/schemas/enterpriseSchemas';
import { RETENTION_DAYS } from '@/lib/qrWhatsappArchive';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await connectDB();
      const DriveConn = getQrWhatsappDriveConnection();
      const driveConn = await DriveConn.findOne({ userId: decoded.userId }).lean();

      return NextResponse.json({
        backupEnabled: true,
        googleDriveConnected: !!(driveConn && !(driveConn as any).needsReconnect),
        retentionDays: RETENTION_DAYS,
        lastBackupAt: (driveConn as any)?.lastSyncedAt || null,
        lastBackupStatus: (driveConn as any)?.lastSyncedAt ? 'completed' : 'pending',
        backupHistory: [],
        totalBackups: (driveConn as any)?.lastSyncedAt ? 1 : 0,
      });
    } catch (dbErr) {
      console.warn('[QR Backup Status] DB error (returning defaults):', dbErr);
      return NextResponse.json({
        backupEnabled: true,
        googleDriveConnected: false,
        retentionDays: RETENTION_DAYS,
        lastBackupAt: null,
        lastBackupStatus: 'pending',
        backupHistory: [],
        totalBackups: 0,
      });
    }
  } catch (error: any) {
    console.error('[QR Backup Status] Critical error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load status' }, { status: 500 });
  }
}
