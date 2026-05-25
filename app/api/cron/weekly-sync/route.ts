/**
 * Vercel Cron Job: Weekly Sync Atlas → Bunny
 * Schedule: 0 4 * * 0 (Every Sunday 4:00 AM UTC)
 *
 * Runs AFTER daily backup (2 AM) and export (3 AM) — no collision.
 *
 * What it does:
 *  1. Full DB snapshot → /weekly-backups/weekly-YYYY-MM-DD.json.gz
 *  2. Archive old LOG data (>7 days) from Atlas → Bunny /archives/logs/
 *  3. Clean AdminSession records older than 30 days
 *
 * ⚠️  NEVER deletes business data (User, Course, Workshop, Purchase etc.)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WeeklySyncService } from '@/lib/backup/weekly-sync';
import { logger } from '@/lib/backup/logger';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('⏰ Vercel Cron: Weekly sync triggered (Sunday 4 AM UTC)');
    await connectDB();

    const syncService = new WeeklySyncService(process.env.BUNNY_STORAGE_KEY!);
    const result = await syncService.runSync();

    logger.info('✅ Weekly sync completed', result);
    return NextResponse.json({ success: result.success, result });
  } catch (error) {
    logger.error('❌ Cron weekly sync failed', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
