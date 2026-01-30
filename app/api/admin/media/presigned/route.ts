import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl } from '@/lib/aws-s3';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/media/presigned
 * Generate a presigned URL for direct S3 upload (bypasses 4.5MB Vercel limit)
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { fileName, contentType, accessLevel = 'public', fileType = 'images' } = await req.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    // Validate access level
    if (!['public', 'admin', 'community'].includes(accessLevel)) {
      return NextResponse.json({ error: 'Invalid access level' }, { status: 400 });
    }

    // Validate file type
    if (!['images', 'videos', 'documents'].includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Generate unique key with proper prefix
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const cleanName = fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
    const key = `${accessLevel}/${fileType}/${timestamp}-${randomId}-${cleanName}`;

    const uploadUrl = await generateUploadUrl(key, contentType, {
      expiresIn: 3600, // 1 hour
    });

    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.AWS_S3_BUCKET || 'swarygoal1hindi';

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        key,
        publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
        proxyUrl: `/api/media/view/${key}`,
      },
    });
  } catch (error) {
    console.error('❌ Presigned URL error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
