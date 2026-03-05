import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/bunny-storage';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/admin/crm/whatsapp/media-upload
 * 
 * Uploads media file to Bunny Storage for QR WhatsApp
 * Uses content-addressed storage to automatically skip duplicates
 * Returns a public CDN URL (swaryogacrm.b-cdn.net)
 * 
 * @param req FormData with file
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

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - allow images, videos, audio, documents
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm',
      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.some(type => file.type.startsWith(type.split('/')[0]) || file.type === type)) {
      console.warn(`[media-upload] Rejected file type: ${file.type}`);
      // Allow anyway for flexibility, just log warning
    }

    // Limit file size (25MB for WhatsApp)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    console.log(`[media-upload] Uploading ${file.name} (${file.size} bytes, ${file.type}) to Bunny Storage`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine extension from mime type or filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `whatsapp-outbound/${Date.now()}-${sanitizedName}`;

    // Upload to S3 using our utility (has built-in de-duplication)
    const s3Url = await uploadToS3(buffer, fileName, {
      contentType: file.type,
      metadata: {
        'original-filename': file.name,
        'uploaded-by': decoded.userId || decoded.username || 'admin',
        'upload-source': 'qr-whatsapp',
      }
    });

    console.log('[media-upload] ✅ Uploaded to Bunny Storage:', s3Url);

    return NextResponse.json({
      success: true,
      url: s3Url,
      size: file.size,
      mimetype: file.type,
      filename: file.name
    });

  } catch (error) {
    console.error('[media-upload] Exception:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to upload media';
    return NextResponse.json(
      { 
        error: errorMsg,
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}
