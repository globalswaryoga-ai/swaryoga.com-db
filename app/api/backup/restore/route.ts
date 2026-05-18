/**
 * POST /api/backup/restore
 * Restore MongoDB from backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { RestoreService } from '@/lib/backup/restore-service';
import { logger } from '@/lib/backup/logger';

async function checkAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = process.env.BACKUP_API_KEY;
  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await checkAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { date, backupId, dryRun = false, validateData = true } = body;

    if (!date && !backupId) {
      return NextResponse.json(
        { error: 'Either date or backupId must be provided' },
        { status: 400 }
      );
    }

    logger.info('🔄 Restore requested', { date, backupId, dryRun });

    const restoreService = new RestoreService(process.env.BUNNY_STORAGE_KEY!);

    const result = await restoreService.restore({
      date,
      backupId,
      dryRun,
      validateData,
    });

    logger.info('✅ Restore completed', result);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error during restore', { error: error.message });
    return NextResponse.json(
      { error: `Restore failed: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!(await checkAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restoreService = new RestoreService(process.env.BUNNY_STORAGE_KEY!);
    const date = req.nextUrl.searchParams.get('date');

    const backups = await restoreService.listBackups(date || undefined);

    return NextResponse.json({
      date: date || new Date().toISOString().split('T')[0],
      backups,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Error listing backups', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}
