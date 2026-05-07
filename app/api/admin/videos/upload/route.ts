import { NextRequest, NextResponse } from 'next/server';
import { connectDB, VideoPlaylist, PlaylistVideo } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { generateUploadUrl, getPublicFileUrl } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

// POST - Get presigned URL for video upload
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      playlistId,
      fileName,
      fileType,
      fileSize,
    } = body;

    if (!playlistId || !fileName || !fileType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Playlist ID, filename, and file type are required' 
      }, { status: 400 });
    }

    // Verify playlist exists
    const playlist = await VideoPlaylist.findById(playlistId);
    if (!playlist) {
      return NextResponse.json({ success: false, error: 'Playlist not found' }, { status: 404 });
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid video format. Allowed: MP4, WebM, MOV, AVI' 
      }, { status: 400 });
    }

    // File size limit (2GB)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'File too large. Maximum size is 2GB' 
      }, { status: 400 });
    }

    // Generate Bunny storage key
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folderPath = playlist.type === 'batch'
      ? `videos/batches/batch-${playlist.batchNumber}`
      : `videos/posts/${playlist.year}/${String(playlist.month).padStart(2, '0')}`;
    const storageKey = `${folderPath}/${timestamp}-${cleanFileName}`;

    // Get content type
    const contentType = fileType || 'video/mp4';

    // Generate upload URL for Bunny Storage
    const uploadUrl = await generateUploadUrl(storageKey, contentType);

    // Generate the final video URL
    const videoUrl = getPublicFileUrl(storageKey);

    return NextResponse.json({
      success: true,
      data: {
        presignedUrl: uploadUrl,
        s3Key: storageKey,
        videoUrl,
        expiresIn: 3600,
      },
      message: 'Upload URL generated successfully',
    });
  } catch (error: any) {
    console.error('[Videos Upload API] Error generating presigned URL:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
