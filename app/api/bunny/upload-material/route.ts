/**
 * Bunny Stream Material Upload API
 * POST /api/bunny/upload-material - Upload material file to Bunny CDN
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'swaryoga-materials';
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL || 'https://swaryoga-materials.b-cdn.net';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!BUNNY_API_KEY) {
      return NextResponse.json({ error: 'Bunny API not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 500MB)' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-z0-9.-]/gi, '_');
    const fileName = `${timestamp}-${originalName}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Bunny Storage
    const bunnyUploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/materials/${fileName}`;

    const uploadResponse = await fetch(bunnyUploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      console.error('[Bunny Upload Error]:', uploadResponse.status, uploadResponse.statusText);
      return NextResponse.json(
        { error: `Failed to upload to Bunny: ${uploadResponse.statusText}` },
        { status: 500 }
      );
    }

    // Generate CDN URL
    const cdnUrl = `${BUNNY_CDN_URL}/materials/${fileName}`;

    return NextResponse.json({
      success: true,
      url: cdnUrl,
      fileName: fileName,
      fileSize: file.size,
      message: 'File uploaded successfully to Bunny CDN',
    });
  } catch (error: any) {
    console.error('[Bunny Material Upload Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
