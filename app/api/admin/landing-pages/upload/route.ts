import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/bunny-storage';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/admin/landing-pages/upload
 * 
 * Uploads images for landing pages to Bunny Storage
 * Returns a public CDN URL
 * 
 * @param req FormData with file and optional field (e.g., 'heroImage', 'instructorImage')
 * @returns { success: true, url: string, size: number, mimetype: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || '';
    const decoded: any = verifyToken(token);
    
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const field = formData.get('field') as string || 'image';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - allow images only for landing pages
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP, SVG` },
        { status: 400 }
      );
    }

    // Limit file size (10MB for images)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    console.log(`[lp-upload] Uploading ${file.name} (${file.size} bytes, ${file.type}) for ${field}`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine extension from mime type
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
    const fileName = `landing-pages/${field}/${Date.now()}-${sanitizedName}.${ext}`;

    // Upload to S3/Bunny Storage
    const uploadedUrl = await uploadToS3(buffer, fileName, {
      contentType: file.type,
      metadata: {
        'original-filename': file.name,
        'uploaded-by': decoded.userId || decoded.username || 'admin',
        'upload-source': 'landing-page-builder',
        'field': field,
      }
    });

    console.log('[lp-upload] ✅ Uploaded to storage:', uploadedUrl);

    return NextResponse.json({
      success: true,
      url: uploadedUrl,
      size: file.size,
      mimetype: file.type,
      filename: file.name,
      field
    });

  } catch (error) {
    console.error('[lp-upload] Exception:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json(
      { 
        error: errorMsg,
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}
