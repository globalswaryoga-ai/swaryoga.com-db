/**
 * Vercel Cron Job: Daily Data Export to Bunny
 * Schedule: 0 3 * * * (Every day 3:00 AM UTC)
 *
 * Writes to:
 *   /data/latest/CollectionName.json       ← always fresh
 *   /data/history/YYYY-MM-DD/CollectionName.json  ← audit trail (90-day retention)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { snapshotBunnySqlToStorage } from '@/lib/bunnySqlStorageSnapshot';
import { logger } from '@/lib/backup/logger';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('⏰ Vercel Cron: Daily export triggered');
    // Bunny SQL is now the live application database. Snapshot it directly to
    // Bunny Storage so Atlas availability cannot block the daily archive.
    const { results, totalBytes: totalSizeBytes, date: dateStr } = await snapshotBunnySqlToStorage();

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    logger.info(`✅ Daily export completed for ${dateStr}`);

    return NextResponse.json({
      success: true,
      date: dateStr,
      totalSizeMB: (totalSizeBytes / 1024 / 1024).toFixed(2),
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    logger.error('❌ Cron export failed', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
