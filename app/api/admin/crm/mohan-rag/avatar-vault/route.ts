import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { uploadUserFile } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Ensure table exists on first run
let tableInitialized = false;
async function ensureTable() {
  if (tableInitialized) return;
  try {
    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS mohan_avatar_vault_sql (
        slot_id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_url TEXT,
        face_thumbnail_url TEXT,
        category TEXT,
        uploaded_at TEXT,
        updated_at TEXT,
        trim_start REAL DEFAULT 0,
        trim_end REAL DEFAULT 180,
        original_duration REAL DEFAULT 0
      )
    `);

    // Safely add any new columns to existing tables
    try { await bunnyExecute(`ALTER TABLE mohan_avatar_vault_sql ADD COLUMN trim_start REAL DEFAULT 0`); } catch {}
    try { await bunnyExecute(`ALTER TABLE mohan_avatar_vault_sql ADD COLUMN trim_end REAL DEFAULT 180`); } catch {}
    try { await bunnyExecute(`ALTER TABLE mohan_avatar_vault_sql ADD COLUMN original_duration REAL DEFAULT 0`); } catch {}

    tableInitialized = true;
  } catch (err) {
    console.warn('[mohan-avatar-vault] table check error:', err);
  }
}

/**
 * GET /api/admin/crm/mohan-rag/avatar-vault
 * Loads all saved training videos for Mohan Sir Avatar
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 401);
    }

    await ensureTable();

    const res = await bunnyExecute({
      sql: 'SELECT slot_id, file_name, file_url, face_thumbnail_url, category, uploaded_at, trim_start, trim_end, original_duration FROM mohan_avatar_vault_sql ORDER BY slot_id ASC',
      args: [],
    });

    const slotsMap: Record<string, any> = {};
    for (const row of res.rows || []) {
      const slotId = String(row.slot_id);
      slotsMap[slotId] = {
        fileName: String(row.file_name || ''),
        fileUrl: String(row.file_url || ''),
        faceThumbnailUrl: String(row.face_thumbnail_url || ''),
        category: String(row.category || ''),
        uploadedAt: String(row.uploaded_at || ''),
        trimStart: Number(row.trim_start ?? 0),
        trimEnd: Number(row.trim_end ?? 180),
        originalDuration: Number(row.original_duration ?? 0),
      };
    }

    return apiSuccess({ slots: slotsMap, total: Object.keys(slotsMap).length });
  } catch (err: any) {
    console.error('[avatar-vault GET]', err);
    return apiError(err.message || 'Failed to load avatar vault', 500);
  }
}

/**
 * POST /api/admin/crm/mohan-rag/avatar-vault
 * Saves or uploads reference video files directly to Bunny Storage + Database
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 401);
    }

    await ensureTable();

    const contentType = req.headers.get('content-type') || '';

    // Case 1: JSON metadata save
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const slots = body.slots || {};

      for (const [slotId, item] of Object.entries(slots)) {
        const it = item as any;
        if (!it?.fileName) continue;
        await bunnyExecute({
          sql: `INSERT INTO mohan_avatar_vault_sql 
                (slot_id, file_name, file_url, face_thumbnail_url, category, uploaded_at, trim_start, trim_end, original_duration, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(slot_id) DO UPDATE SET
                  file_name=excluded.file_name,
                  file_url=excluded.file_url,
                  face_thumbnail_url=excluded.face_thumbnail_url,
                  category=excluded.category,
                  uploaded_at=excluded.uploaded_at,
                  trim_start=excluded.trim_start,
                  trim_end=excluded.trim_end,
                  original_duration=excluded.original_duration,
                  updated_at=datetime('now')`,
          args: [
            slotId,
            it.fileName || '',
            it.fileUrl || '',
            it.faceThumbnailUrl || '',
            it.category || '',
            it.uploadedAt || new Date().toLocaleTimeString(),
            Number(it.trimStart ?? 0),
            Number(it.trimEnd ?? 180),
            Number(it.originalDuration ?? 0),
          ],
        });
      }

      return apiSuccess({ saved: true, count: Object.keys(slots).length });
    }

    // Case 2: Multipart file upload to Bunny Storage
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slotId = (formData.get('slotId') as string) || 'slot-01';
    const faceThumb = (formData.get('faceThumbnailUrl') as string) || '';
    const trimStart = Number(formData.get('trimStart') ?? 0);
    const trimEnd = Number(formData.get('trimEnd') ?? 180);
    const originalDuration = Number(formData.get('originalDuration') ?? 0);

    if (!file) {
      return apiError('No file provided', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRes = await uploadUserFile(
      buffer,
      file.name,
      'mohan-rag-avatar',
      'training-vault',
      file.type || 'video/mp4'
    );

    const publicUrl = uploadRes?.url || '';

    await bunnyExecute({
      sql: `INSERT INTO mohan_avatar_vault_sql 
            (slot_id, file_name, file_url, face_thumbnail_url, category, uploaded_at, trim_start, trim_end, original_duration, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(slot_id) DO UPDATE SET
              file_name=excluded.file_name,
              file_url=excluded.file_url,
              face_thumbnail_url=excluded.face_thumbnail_url,
              uploaded_at=excluded.uploaded_at,
              trim_start=excluded.trim_start,
              trim_end=excluded.trim_end,
              original_duration=excluded.original_duration,
              updated_at=datetime('now')`,
      args: [
        slotId,
        file.name,
        publicUrl,
        faceThumb,
        'reference-video',
        new Date().toLocaleTimeString(),
        trimStart,
        trimEnd,
        originalDuration,
      ],
    });

    return apiSuccess({
      slotId,
      fileName: file.name,
      fileUrl: publicUrl,
      faceThumbnailUrl: faceThumb,
      trimStart,
      trimEnd,
      originalDuration,
      saved: true,
    });
  } catch (err: any) {
    console.error('[avatar-vault POST]', err);
    return apiError(err.message || 'Failed to save video to avatar vault', 500);
  }
}
