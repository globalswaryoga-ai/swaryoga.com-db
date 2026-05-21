/**
 * Vercel Cron Job: Daily Backup
 * Schedule: 0 2 * * * (Every day 2:00 AM UTC)
 * Secured by CRON_SECRET env var
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BackupService } from '@/lib/backup/backup-service';
import { logger } from '@/lib/backup/logger';

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('⏰ Vercel Cron: Daily backup triggered');
    await connectDB();

    const bunnyKey = process.env.BUNNY_STORAGE_KEY!;
    const backupService = new BackupService(bunnyKey);
    const result = await backupService.executeBackup();

    logger.info('✅ Daily backup completed', result);
    return NextResponse.json({ success: true, result });

  } catch (error) {
    logger.error('❌ Cron backup failed', { error: (error as Error).message });
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
