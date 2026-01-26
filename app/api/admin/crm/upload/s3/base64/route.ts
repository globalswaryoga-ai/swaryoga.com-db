import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { verifyToken } from '@/lib/auth';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { base64, fileName, category = 'inbound' } = await req.json();
    
    if (!base64) {
      return NextResponse.json({ error: 'Base64 data is required' }, { status: 400 });
    }

    // Extract mime type and buffer
    const match = base64.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid base64 format' }, { status: 400 });
    }
    
    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    
    const timestamp = Date.now();
    const cleanName = fileName ? fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '') : `media-${timestamp}`;
    const key = `${category}/${timestamp}-${cleanName}`;
    const region = process.env.AWS_REGION || 'ap-south-1';
    const bucket = process.env.AWS_S3_BUCKET || 'swarygoal1hindi';

    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }));

    return NextResponse.json({ 
      success: true, 
      data: {
        key,
        publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
        indirectUrl: `/api/media/view/${key}`
      }
    });

  } catch (error) {
    console.error('Base64 Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload base64' }, 
      { status: 500 }
    );
  }
}
