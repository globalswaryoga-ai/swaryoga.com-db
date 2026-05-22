export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl } from '@/lib/bunny-storage';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileType, contentType } = await req.json();
    
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 });
    }

    // Generate unique filename for S3 - using social_media/ prefix as requested
    const timestamp = Date.now();
    const cleanName = fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
    const key = `social_media/${timestamp}-${cleanName}`;

    const uploadUrl = await generateUploadUrl(key, contentType);

    const cdnHost = process.env.BUNNY_STORAGE_CDN_HOST || '';
    const publicUrl = `https://${cdnHost}/${key}`;

    return NextResponse.json({ 
      success: true, 
      data: {
        uploadUrl,
        key,
        indirectUrl: `/api/admin/crm/media/proxy?url=${encodeURIComponent(publicUrl)}`,
        publicUrl,
        // API key needed for direct client uploads to Bunny Storage
        storageApiKey: process.env.BUNNY_STORAGE_API_KEY || '',
      }
    });

  } catch (error) {
    console.error('Presigned URL error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate upload URL' }, 
      { status: 500 }
    );
  }
}
