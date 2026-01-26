import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/aws-s3';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Check AWS credentials first
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('[S3 Upload] Missing AWS credentials - AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not set');
      return NextResponse.json({ 
        error: 'S3 upload not configured. Please contact administrator.' 
      }, { status: 503 });
    }

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

    // Upload to S3 (no ACL - bucket policy controls public access)
    console.log('[S3 Upload] Uploading:', key, 'size:', buffer.length);
    const s3Url = await uploadToS3(buffer, key, {
      bucket: process.env.AWS_S3_BUCKET || 'swaryoga-media',
      // ACL removed - use bucket policy for public access instead
      // This prevents 500 errors on buckets with "Block Public Access" enabled
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
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    // Check for common AWS errors
    if (errorMessage.includes('credentials') || errorMessage.includes('AccessDenied')) {
      return NextResponse.json(
        { error: 'S3 credentials error. Please check AWS configuration.' }, 
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}
