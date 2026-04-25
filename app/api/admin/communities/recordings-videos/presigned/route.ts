import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/communities/recordings-videos/presigned
 * Generate a presigned Bunny Storage upload URL for direct client uploads
 * Bypasses server payload limits by uploading directly to Bunny
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { fileName, communityId, title, description } = body;

    if (!fileName || !communityId || !title) {
      return NextResponse.json(
        { error: 'fileName, communityId, and title are required' },
        { status: 400 }
      );
    }

    // Validate file extension
    const validExtensions = ['mp4', 'webm', 'mov', 'avi'];
    const ext = fileName.toLowerCase().split('.').pop();
    if (!validExtensions.includes(ext || '')) {
      return NextResponse.json(
        { error: 'Invalid video format. Allowed: MP4, WebM, MOV, AVI' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify community exists
    const { getCommunity } = await import('@/lib/db');
    const Community = getCommunity();
    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Get Bunny credentials from env
    const bunnyZone = process.env.BUNNY_STORAGE_ZONE_NAME;
    const bunnyApiKey = process.env.BUNNY_STORAGE_API_KEY;
    const bunnyHost = process.env.BUNNY_STORAGE_REGION ?
      `${process.env.BUNNY_STORAGE_REGION}.storage.bunnycdn.com` :
      'storage.bunnycdn.com';

    if (!bunnyZone || !bunnyApiKey) {
      return NextResponse.json(
        { error: 'Bunny Storage not configured' },
        { status: 500 }
      );
    }

    // Generate storage path
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `community/${communityId}/videos/${timestamp}-${random}-${safeName}`;

    // Build presigned upload URL for Bunny Storage
    const uploadUrl = `https://${bunnyHost}/${bunnyZone}/${storagePath}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      storagePath,
      community: {
        id: communityId,
        name: community.name,
      },
      headers: {
        AccessKey: bunnyApiKey,
        'Content-Type': 'application/octet-stream',
      },
      instructions: {
        step1: 'Upload file directly to uploadUrl using PUT method',
        step2: 'Include AccessKey header from headers object',
        step3: 'After upload completes, call POST /api/admin/communities/recordings-videos/confirm',
        step4: 'Pass: { storagePath, title, description, communityId }',
      },
    });
  } catch (error: any) {
    console.error('❌ Generate presigned URL error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
