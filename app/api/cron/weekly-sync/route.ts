/**
 * Vercel Cron Job: Weekly Sync Atlas → Bunny
 * Schedule: 0 2 * * 0 (Every Sunday 2:00 AM UTC)
 */

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
    logger.info('⏰ Vercel Cron: Weekly sync triggered');
    await connectDB();

    const syncService = new WeeklySyncService(process.env.BUNNY_STORAGE_KEY!);
    const result = await syncService.runSync();

    logger.info('✅ Weekly sync completed', result);
    return NextResponse.json({ success: true, result });

  } catch (error) {
    logger.error('❌ Cron weekly sync failed', { error: (error as Error).message });
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
