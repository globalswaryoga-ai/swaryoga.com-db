/**
 * Vercel Cron Job: Daily Data Export to Bunny
 * Schedule: 0 3 * * * (Every day 3:00 AM UTC)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { DailyExportService } from '@/lib/backup/daily-export';
import { logger } from '@/lib/backup/logger';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('⏰ Vercel Cron: Daily export triggered');
    await connectDB();

    const exportService = new DailyExportService(process.env.BUNNY_STORAGE_KEY!);
    const { results, totalSize } = await exportService.runExport();

    logger.info('✅ Daily export completed');
    return NextResponse.json({
      success: true,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      results,
    });

  } catch (error) {
    logger.error('❌ Cron export failed', { error: (error as Error).message });
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
