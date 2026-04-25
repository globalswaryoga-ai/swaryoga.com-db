import { NextRequest, NextResponse } from 'next/server';
import { connectDB, VideoPlaylist, PlaylistVideo } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';


const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'swarygoal1hindi';

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

    // Generate S3 key
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folderPath = playlist.type === 'batch' 
      ? `videos/batches/batch-${playlist.batchNumber}`
      : `videos/posts/${playlist.year}/${String(playlist.month).padStart(2, '0')}`;
    const s3Key = `${folderPath}/${timestamp}-${cleanFileName}`;

    // Get extension for content type
    const extension = fileName.split('.').pop()?.toLowerCase();
    const contentType = fileType || 'video/mp4';

    // Generate presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    // Generate the final video URL
    const videoUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    return NextResponse.json({
      success: true,
      data: {
        presignedUrl,
        s3Key,
        videoUrl,
        bucket: S3_BUCKET,
        expiresIn: 3600,
      },
      message: 'Upload URL generated successfully',
    });
  } catch (error: any) {
    console.error('[Videos Upload API] Error generating presigned URL:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
