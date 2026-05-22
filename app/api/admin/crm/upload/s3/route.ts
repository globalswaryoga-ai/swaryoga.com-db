export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/bunny-storage';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Check Bunny Storage credentials
    if (!process.env.BUNNY_STORAGE_ZONE_NAME || !process.env.BUNNY_STORAGE_API_KEY) {
      console.error('[Storage Upload] Missing Bunny Storage credentials');
      return NextResponse.json({ 
        error: 'Storage upload not configured. Please contact administrator.' 
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

    // Upload to Bunny Storage
    console.log('[Storage Upload] Uploading:', key, 'size:', buffer.length);
    const s3Url = await uploadToS3(buffer, key, {
      contentType: file.type,
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
    // Check for common storage errors
    if (errorMessage.includes('credentials') || errorMessage.includes('not configured')) {
      return NextResponse.json(
        { error: 'Storage credentials error. Please check Bunny Storage configuration.' }, 
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}
