// API Route: Handle backup and sync operations
import { mongoDBSync } from '@/lib/mongoDBSyncManager';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'sync';

    if (action === 'sync') {
      // Sync local data to MongoDB
      const result = await mongoDBSync.manualSync();
      return NextResponse.json({
        success: true,
        message: 'Data synced to MongoDB',
        data: result,
      });
    }

    if (action === 'backup') {
      // Create manual backup
      const result = await mongoDBSync.createBackup('manual');
      return NextResponse.json({
        success: true,
        message: 'Manual backup created',
        data: result,
      });
    }

    if (action === 'get-backups') {
      // Get all backups
      const backups = await mongoDBSync.getBackups();
      return NextResponse.json({
        success: true,
        data: backups,
      });
    }

    if (action === 'restore') {
      // Restore from backup
      const backupId = body.backupId;
      if (!backupId) {
        return NextResponse.json(
          { success: false, message: 'Backup ID required' },
          { status: 400 }
        );
      }

      const result = await mongoDBSync.restoreFromBackup(backupId);
      return NextResponse.json({
        success: result,
        message: result ? 'Data restored' : 'Restore failed',
      });
    }

    if (action === 'status') {
      // Get sync status
      const status = await mongoDBSync.getSyncStatus();
      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Backup API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      const status = await mongoDBSync.getSyncStatus();
      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    if (action === 'backups') {
      const backups = await mongoDBSync.getBackups();
      return NextResponse.json({
        success: true,
        data: backups,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Backup API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
