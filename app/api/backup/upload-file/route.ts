/**
 * POST /api/backup/upload-file
 * Upload a backup file from local disk to Bunny backupmobgo
 * Requires: Authorization header with BACKUP_API_KEY
 *
 * Usage (curl):
 * curl -X POST \
 *   -H "Authorization: Bearer ${BACKUP_API_KEY}" \
 *   -F "file=@/path/to/backup.tar.gz" \
 *   https://your-domain.com/api/backup/upload-file
 */

import { NextRequest, NextResponse } from 'next/server';
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

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Use form data with field name "file"' },
        { status: 400 }
      );
    }

    logger.info(`📤 Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    const buffer = Buffer.from(await file.arrayBuffer());
    const bunny = new BunnyStorageClient(bunnyKey, 'backupmobgo');

    // Upload to backups folder with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `/backups/mongodb/${timestamp}/${file.name}`;

    await bunny.upload(fileName, buffer);

    logger.info(`✅ File uploaded successfully: ${fileName}`);

    return NextResponse.json({
      success: true,
      message: '✅ File uploaded to Bunny backupmobgo',
      file: {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        location: fileName,
        zone: 'backupmobgo',
      },
      timestamp: new Date(),
      nextSteps: [
        '1. File is now in Bunny backupmobgo storage',
        '2. Automatic backups start at 2:00 AM UTC daily',
        '3. Check /api/backup/status to verify',
      ],
    });
  } catch (error) {
    logger.error('File upload failed', { error: error.message });
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    );
  }
}
