import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { 
  uploadPublicFile, 
  uploadAdminFile, 
  uploadCommunityFile,
  uploadCommunityVideo 
} from '@/lib/aws-s3';

export const dynamic = 'force-dynamic';

// Max file sizes
const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_DOC_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * POST /api/admin/media/upload
 * Upload file to proper S3 bucket based on access level
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const accessLevel = formData.get('accessLevel') as string;
    const fileType = formData.get('fileType') as string;
    const communityId = formData.get('communityId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!accessLevel || !['public', 'admin', 'community'].includes(accessLevel)) {
      return NextResponse.json({ error: 'Invalid access level' }, { status: 400 });
    }

    if (!fileType || !['images', 'videos', 'documents'].includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    if (accessLevel === 'community' && !communityId) {
      return NextResponse.json({ error: 'Community ID required for community uploads' }, { status: 400 });
    }

    // Validate file size
    let maxSize = MAX_IMAGE_SIZE;
    if (fileType === 'videos') maxSize = MAX_VIDEO_SIZE;
    if (fileType === 'documents') maxSize = MAX_DOC_SIZE;

    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB` 
      }, { status: 400 });
    }

    // Validate file type
    const allowedMimeTypes: Record<string, string[]> = {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      videos: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
      documents: [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ]
    };

    if (!allowedMimeTypes[fileType]?.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type. Allowed: ${allowedMimeTypes[fileType]?.join(', ')}` 
      }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;

    let url: string;

    // Upload based on access level
    switch (accessLevel) {
      case 'public':
        url = await uploadPublicFile(buffer, fileName, fileType as 'images' | 'videos' | 'documents');
        break;
      
      case 'admin':
        url = await uploadAdminFile(buffer, fileName, fileType as 'images' | 'videos' | 'documents' | 'reports');
        break;
      
      case 'community':
        if (fileType === 'videos') {
          url = await uploadCommunityVideo(buffer, fileName, communityId);
        } else {
          url = await uploadCommunityFile(buffer, fileName, communityId, fileType as 'images' | 'videos' | 'documents');
        }
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid access level' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      url,
      accessLevel,
      fileType,
      communityId: accessLevel === 'community' ? communityId : undefined,
      fileName,
      size: file.size,
    });

  } catch (error: any) {
    console.error('❌ Media upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
