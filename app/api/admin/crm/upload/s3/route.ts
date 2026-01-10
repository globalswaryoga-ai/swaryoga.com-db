import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/aws-s3';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'image', 'video', 'document'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate unique filename
    const timestamp = Date.now();
    const cleanName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
    const key = `crm-uploads/${type}s/${timestamp}-${cleanName}`;

    // Upload to S3
    const s3Url = await uploadToS3(buffer, key, {
      bucket: process.env.AWS_S3_BUCKET || 'swaryoga-media',
      acl: 'public-read',
      metadata: {
        'original-name': file.name,
        'uploaded-by': decoded.userId || 'unknown',
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        url: s3Url,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' }, 
      { status: 500 }
    );
  }
}
