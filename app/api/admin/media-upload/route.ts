/**
 * POST /api/admin/media-upload
 * ─────────────────────────────────────────────────────────
 * Upload a single file from a phone to Bunny CDN.
 * Stores at: /phone-media/{device}/{folder}/{YYYY-MM-DD}/{filename}
 *
 * Auth: Bearer <admin JWT>
 * Body: multipart/form-data
 *   file     — the file blob
 *   device   — device name (e.g. "OnePlus", "iPhone")
 *   folder   — category folder (e.g. "marketing", "events")
 *   filename — original filename (optional, fallback to file.name)
 * ─────────────────────────────────────────────────────────
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const BUNNY_ZONE     = 'backupmobgo';
const BUNNY_BASE_URL = 'https://storage.bunnycdn.com';

function slugify(str: string): string {
  return str.trim().replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = verifyToken(token) as any;
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  // ── Parse form data ───────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file   = formData.get('file') as File | null;
  const device = ((formData.get('device') as string) || 'unknown-device').trim();
  const folder = ((formData.get('folder') as string) || 'general').trim();
  const fname  = ((formData.get('filename') as string) || file?.name || 'file').trim();

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  // ── Size check (Vercel serverless: 50 MB max per request) ────────────────
  const MAX_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 50 MB per file.` },
      { status: 413 }
    );
  }

  // ── Build Bunny path ──────────────────────────────────────────────────────
  const dateStr    = new Date().toISOString().split('T')[0];
  const safeDevice = slugify(device);
  const safeFolder = slugify(folder);
  const safeName   = slugify(fname);
  const bunnyPath  = `/phone-media/${safeDevice}/${safeFolder}/${dateStr}/${safeName}`;

  // ── Upload to Bunny ───────────────────────────────────────────────────────
  try {
    const storageKey = process.env.BUNNY_STORAGE_KEY!;
    if (!storageKey) throw new Error('BUNNY_STORAGE_KEY not configured');

    const buffer = Buffer.from(await file.arrayBuffer());

    const res = await fetch(`${BUNNY_BASE_URL}/${BUNNY_ZONE}${bunnyPath}`, {
      method:  'PUT',
      headers: {
        AccessKey:      storageKey,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: buffer,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`Bunny error ${res.status}: ${msg}`);
    }

    return NextResponse.json({
      success:  true,
      path:     bunnyPath,
      name:     safeName,
      sizeMB:   (file.size / 1024 / 1024).toFixed(2),
      type:     file.type,
      device:   safeDevice,
      folder:   safeFolder,
      date:     dateStr,
    });
  } catch (err) {
    console.error('[media-upload] Bunny upload failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ── GET: list recently uploaded files for a device ───────────────────────────
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = verifyToken(token) as any;
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const device = searchParams.get('device');

  try {
    const storageKey = process.env.BUNNY_STORAGE_KEY!;
    const listPath   = device
      ? `/phone-media/${slugify(device)}`
      : `/phone-media`;

    const res = await fetch(`${BUNNY_BASE_URL}/${BUNNY_ZONE}${listPath}/`, {
      headers: { AccessKey: storageKey },
    });

    if (!res.ok) return NextResponse.json({ files: [] });
    const data = await res.json();
    return NextResponse.json({ files: Array.isArray(data) ? data : [] });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
