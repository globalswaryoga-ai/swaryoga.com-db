import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl } from '@/lib/aws-s3';
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

    // Using indirect proxy link: /api/media/view/[key]
    const indirectUrl = `/api/media/view/${key}`;
    const region = process.env.AWS_REGION || 'ap-south-1';
    const bucket = process.env.AWS_S3_BUCKET || 'swaryoga-media';

    return NextResponse.json({ 
      success: true, 
      data: {
        uploadUrl,
        key,
        indirectUrl,
        publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}`
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
