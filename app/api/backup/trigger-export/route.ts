/**
 * POST /api/backup/trigger-export
 * Manually trigger daily export (for testing)
 * Requires: Authorization header with BACKUP_API_KEY
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { BunnyStorageClient } from '@/lib/backup/bunny-client';
import { logger } from '@/lib/backup/logger';

async function checkAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = process.env.BACKUP_API_KEY;
  return apiKey && authHeader === `Bearer ${apiKey}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await checkAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bunnyKey = process.env.BUNNY_STORAGE_KEY;
    if (!bunnyKey) {
      return NextResponse.json(
        { error: 'Bunny storage not configured' },
        { status: 500 }
      );
    }

    logger.info('🚀 Manual export trigger initiated');

    const bunny = new BunnyStorageClient(bunnyKey, 'backupmobgo');
    const collections = [
      'Course',
      'CourseLesson',
      'Workshop',
      'Sadhana',
      'Video',
      'User',
      'Program',
    ];

    const results: any = [];
    let totalSize = 0;

    for (const collName of collections) {
      try {
        const model = mongoose.models[collName];
        if (!model) {
          results.push({ collection: collName, status: '⏭️  Model not found', count: 0 });
          continue;
        }

        const docs = await model.find({}).lean();
        if (docs.length === 0) {
          results.push({ collection: collName, status: '⏭️  Empty', count: 0 });
          continue;
        }

        const json = JSON.stringify(docs);
        const buffer = Buffer.from(json, 'utf-8');
        totalSize += buffer.length;

        const fileName = `/data/${collName}.json`;
        await bunny.upload(fileName, buffer);

        results.push({
          collection: collName,
          status: '✅ Exported',
          count: docs.length,
          size: `${(buffer.length / 1024 / 1024).toFixed(2)} MB`,
          location: fileName,
        });

        logger.info(`✅ Exported ${collName}: ${docs.length} docs (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      } catch (error) {
        results.push({
          collection: collName,
          status: '❌ Failed',
          error: (error as Error).message,
        });
        logger.error(`Export failed for ${collName}`, { error: (error as Error).message });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date(),
      message: '✅ Manual export completed',
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      results,
      instructions: 'Check Bunny CDN /data/ folder for exported JSON files',
    });
  } catch (error) {
    logger.error('Export trigger failed', { error: error.message });
    return NextResponse.json(
      { error: 'Export trigger failed', details: error.message },
      { status: 500 }
    );
  }
}
