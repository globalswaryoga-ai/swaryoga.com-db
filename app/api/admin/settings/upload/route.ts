/**
 * API Route: Upload Images for Admin Settings
 * POST /api/admin/settings/upload - Upload logo and/or signature
 */

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

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const decoded = verifyToken(request.headers.get('authorization') || '');
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const uploadedUrls: { [key: string]: string } = {};

    // Process logo
    const logoFile = formData.get('logo') as File;
    if (logoFile) {
      const logoUrl = await uploadToS3(logoFile, 'admin-settings/logo');
      uploadedUrls.logoUrl = logoUrl;
    }

    // Process signature
    const signatureFile = formData.get('signature') as File;
    if (signatureFile) {
      const signatureUrl = await uploadToS3(signatureFile, 'admin-settings/signature');
      uploadedUrls.signatureUrl = signatureUrl;
    }

    // Process seal
    const sealFile = formData.get('seal') as File;
    if (sealFile) {
      const sealUrl = await uploadToS3(sealFile, 'admin-settings/seal');
      uploadedUrls.sealUrl = sealUrl;
    }

    return NextResponse.json(uploadedUrls);
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload files' },
      { status: 500 }
    );
  }
}

async function uploadToS3(file: File, folder: string): Promise<string> {
  const buffer = await file.arrayBuffer();
  const timestamp = Date.now();
  const filename = `${folder}/${timestamp}-${file.name}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME || 'swar-yoga-assets',
    Key: filename,
    Body: Buffer.from(buffer),
    ContentType: file.type,
    ACL: 'public-read',
  });

  await s3Client.send(command);

  // Construct S3 URL
  const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${filename}`;
  return s3Url;
}
