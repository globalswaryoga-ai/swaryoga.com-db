import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { QRBackupService } from '@/lib/qrBackupService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const backupService = new QRBackupService(db);

    // Get user account
    const userAccount = await db.collection('qr_user_accounts').findOne({ _id: userId });
    if (!userAccount) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    // Get backup history
    const backupHistory = await backupService.getBackupHistory(userId, 20);

    // Get latest backup
    const latestBackup = backupHistory[0] || null;

    return NextResponse.json({
      success: true,
      backupEnabled: userAccount.backupEnabled || false,
      googleDriveConnected: userAccount.googleDriveConnected || false,
      retentionDays: userAccount.retentionDays || 730,
      lastBackupAt: latestBackup?.updatedAt || null,
      lastBackupStatus: latestBackup?.status || 'none',
      backupHistory: backupHistory.slice(0, 10), // Last 10 backups
      totalBackups: backupHistory.length,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[QR Backup Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get backup status' },
      { status: 500 }
    );
  }
}
