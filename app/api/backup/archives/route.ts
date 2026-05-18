/**
 * GET /api/backup/archives?collection=VideoWatchLog&startDate=2026-05-01&endDate=2026-05-18
 * Retrieve archived data from Bunny tiers
 */

import { NextRequest, NextResponse } from 'next/server';
import { ArchiveService } from '@/lib/backup/archive-service';
import { logger } from '@/lib/backup/logger';

async function checkAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = process.env.BACKUP_API_KEY;
  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    if (!(await checkAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collection = req.nextUrl.searchParams.get('collection');
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');
    const action = req.nextUrl.searchParams.get('action') || 'retrieve';

    if (!collection || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: collection, startDate, endDate' },
        { status: 400 }
      );
    }

    const archiveService = new ArchiveService(process.env.BUNNY_STORAGE_KEY!);

    if (action === 'analyze') {
      // Get tier analysis
      const analysis = await archiveService.analyzeTiers();
      return NextResponse.json(analysis);
    }

    if (action === 'report') {
      // Get storage report
      const report = await archiveService.getStorageReport();
      return NextResponse.json(report);
    }

    // Default: retrieve data
    const data = await archiveService.retrieveData(
      collection,
      new Date(startDate),
      new Date(endDate)
    );

    logger.info(`✅ Retrieved ${data.length} documents from archives`, {
      collection,
      startDate,
      endDate,
    });

    return NextResponse.json({
      collection,
      dateRange: { start: startDate, end: endDate },
      count: data.length,
      data: data.slice(0, 100), // Return first 100
      truncated: data.length > 100,
      totalAvailable: data.length,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Error retrieving archives', { error: error.message });
    return NextResponse.json(
      { error: `Failed to retrieve archives: ${error.message}` },
      { status: 500 }
    );
  }
}
