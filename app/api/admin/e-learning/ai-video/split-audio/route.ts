import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const execAsync = promisify(exec);

const SPLIT_DIR_BASE = path.join(os.tmpdir(), 'swaryoga_rag_splits');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const topicTitle = String(formData.get('topicTitle') || '').trim();
    const targetPartMBRequested = Number(formData.get('targetPartMB') || 22);
    const targetPartMB = Math.min(23.5, Math.max(10, targetPartMBRequested));

    if (!file) {
      return NextResponse.json({ error: 'Audio or video file is required' }, { status: 400 });
    }

    const originalSizeBytes = file.size;
    const originalSizeMB = originalSizeBytes / (1024 * 1024);

    if (originalSizeMB <= 24) {
      return NextResponse.json({
        success: true,
        message: 'File is already under 24MB limit, no splitting required',
        partsCount: 1,
        parts: [],
      });
    }

    // Determine number of parts (e.g. 64.4MB / 21MB = 3.06 -> 3 or 4 parts)
    const partsCount = Math.max(2, Math.ceil(originalSizeMB / targetPartMB));

    const batchId = `split_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const batchDir = path.join(SPLIT_DIR_BASE, batchId);
    ensureDir(batchDir);

    const safeCleanName = (file.name || 'recording.m4a').replace(/[^a-zA-Z0-9._-]/g, '_');
    const sourcePath = path.join(batchDir, `source_${safeCleanName}`);

    // Write uploaded file to disk
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(sourcePath, Buffer.from(arrayBuffer));

    // Get duration via ffprobe
    let durationSeconds = 0;
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${sourcePath}"`
      );
      durationSeconds = parseFloat(stdout.trim()) || 0;
    } catch (e) {
      console.warn('[Split Audio] ffprobe duration error, attempting ffmpeg fallback:', e);
    }

    if (durationSeconds <= 0) {
      // Fallback: estimate duration from average bitrate or file size
      durationSeconds = Math.max(60, originalSizeMB * 30); // ~2MB/min fallback
    }

    const chunkDuration = durationSeconds / partsCount;
    const baseName = safeCleanName.replace(/\.[^/.]+$/, '');
    const parts: Array<{
      partNumber: number;
      topicTitle: string;
      fileName: string;
      sizeBytes: number;
      sizeMB: number;
      durationSeconds: number;
      downloadUrl: string;
      localPath: string;
    }> = [];

    // Slice each part using ffmpeg with 64kbps aac speech audio
    for (let i = 0; i < partsCount; i++) {
      const partNumber = i + 1;
      const start = i * chunkDuration;
      const outputFileName = `${baseName}_Part_${partNumber}.m4a`;
      const outputPath = path.join(batchDir, `part_${partNumber}.m4a`);

      try {
        await execAsync(
          `ffmpeg -y -ss ${start.toFixed(2)} -t ${chunkDuration.toFixed(2)} -i "${sourcePath}" -vn -c:a aac -b:a 64k "${outputPath}"`
        );
      } catch (err: any) {
        console.error(`[Split Audio] ffmpeg error on part ${partNumber}:`, err);
        // Try direct stream copy fallback
        await execAsync(
          `ffmpeg -y -ss ${start.toFixed(2)} -t ${chunkDuration.toFixed(2)} -i "${sourcePath}" -c copy "${outputPath}"`
        );
      }

      const stat = fs.statSync(outputPath);
      const partSizeMB = Number((stat.size / (1024 * 1024)).toFixed(1));
      const partTitle = topicTitle ? `${topicTitle} - Part ${partNumber}` : `Part ${partNumber}`;

      parts.push({
        partNumber,
        topicTitle: partTitle,
        fileName: outputFileName,
        sizeBytes: stat.size,
        sizeMB: partSizeMB,
        durationSeconds: Math.round(chunkDuration),
        downloadUrl: `/api/admin/e-learning/ai-video/split-audio?batchId=${batchId}&part=${partNumber}`,
        localPath: outputPath,
      });
    }

    // Save batch metadata
    const metaPath = path.join(batchDir, 'metadata.json');
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          batchId,
          topicTitle,
          originalName: file.name,
          originalSizeMB: Number(originalSizeMB.toFixed(1)),
          partsCount,
          totalDurationSeconds: Math.round(durationSeconds),
          parts,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    return NextResponse.json({
      success: true,
      batchId,
      partsCount,
      originalSizeMB: Number(originalSizeMB.toFixed(1)),
      targetPartMB,
      totalDurationSeconds: Math.round(durationSeconds),
      parts,
    });
  } catch (error: any) {
    console.error('[Split Audio Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to split audio file' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const part = searchParams.get('part');

    if (!batchId || !part) {
      return NextResponse.json({ error: 'batchId and part parameters required' }, { status: 400 });
    }

    const cleanBatchId = batchId.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanPart = parseInt(part, 10);
    const filePath = path.join(SPLIT_DIR_BASE, cleanBatchId, `part_${cleanPart}.m4a`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Part file not found or expired' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    const headers = new Headers();
    headers.set('Content-Type', 'audio/mp4');
    headers.set('Content-Length', stat.size.toString());
    headers.set('Content-Disposition', `attachment; filename="part_${cleanPart}.m4a"`);

    return new NextResponse(fileStream as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('[Get Split Part Error]:', error);
    return NextResponse.json({ error: 'Failed to retrieve audio part' }, { status: 500 });
  }
}
