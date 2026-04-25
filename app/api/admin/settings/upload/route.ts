/**
 * API Route: Upload Images for Admin Settings
 * POST /api/admin/settings/upload - Upload logo and/or signature
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/bunny-storage';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


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
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      const logoUrl = await uploadToS3(buffer, `admin-settings/logo-${logoFile.name}`, { contentType: logoFile.type });
      uploadedUrls.logoUrl = logoUrl;
    }

    // Process signature
    const signatureFile = formData.get('signature') as File;
    if (signatureFile) {
      const buffer = Buffer.from(await signatureFile.arrayBuffer());
      const signatureUrl = await uploadToS3(buffer, `admin-settings/signature-${signatureFile.name}`, { contentType: signatureFile.type });
      uploadedUrls.signatureUrl = signatureUrl;
    }

    // Process seal
    const sealFile = formData.get('seal') as File;
    if (sealFile) {
      const buffer = Buffer.from(await sealFile.arrayBuffer());
      const sealUrl = await uploadToS3(buffer, `admin-settings/seal-${sealFile.name}`, { contentType: sealFile.type });
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
