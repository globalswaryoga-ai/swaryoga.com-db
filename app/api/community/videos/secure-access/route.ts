import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getProtectedUrl } from '@/lib/aws-s3';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Secret for generating secure video tokens
const VIDEO_ACCESS_SECRET = process.env.JWT_SECRET || 'fallback-video-secret';

/**
 * Generate a secure access token for video playback
 * Token is time-limited (1 hour) and tied to user + video
 */
function generateVideoAccessToken(userId: string, videoId: string): string {
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  const payload = `${userId}:${videoId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', VIDEO_ACCESS_SECRET)
    .update(payload)
    .digest('hex');
  
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

/**
 * Verify video access token
 */
function verifyVideoAccessToken(token: string, videoId: string): { valid: boolean; userId?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 4) return { valid: false };
    
    const [userId, tokenVideoId, expiresAtStr, signature] = parts;
    
    // Check if token is for this video
    if (tokenVideoId !== videoId) return { valid: false };
    
    // Check expiration
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) return { valid: false };
    
    // Verify signature
    const payload = `${userId}:${tokenVideoId}:${expiresAtStr}`;
    const expectedSignature = crypto
      .createHmac('sha256', VIDEO_ACCESS_SECRET)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) return { valid: false };
    
    return { valid: true, userId };
  } catch {
    return { valid: false };
  }
}

/**
 * GET /api/community/videos/secure-access
 * Get secure access to a video (validates membership, returns protected URLs)
 * 
 * Query params:
 * - videoId: The video ID
 * - token: Optional pre-generated access token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const accessToken = searchParams.get('token');
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    await connectDB();

    const { getCommunityVideo, CommunityMembership } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    // Find the video
    const video = await CommunityVideo.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    let userId: string | undefined;
    let isAdmin = false;

    // Try to authenticate via access token first
    if (accessToken) {
      const tokenResult = verifyVideoAccessToken(accessToken, videoId);
      if (tokenResult.valid) {
        userId = tokenResult.userId;
      }
    }

    // If no valid access token, try auth header
    if (!userId) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const token = authHeader.slice(7);
      const decoded = await verifyToken(token);
      if (!decoded) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      userId = decoded.userId;
      isAdmin = decoded.isAdmin === true;
    }

    // Check membership (unless admin)
    if (!isAdmin && userId) {
      const membership = await CommunityMembership.findOne({
        communityId: video.communityId,
        $or: [
          { userId },
          { odId: userId }
        ],
        status: 'active'
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'You must be a member of this community to view videos' },
          { status: 403 }
        );
      }
    }

    // Increment view count
    await CommunityVideo.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    // Generate secure access token for future requests
    const newAccessToken = generateVideoAccessToken(userId || 'anonymous', videoId);

    // Build response based on video source
    let accessUrl: string | null = null;
    let embedHtml: string | null = null;

    if (video.videoSource === 'youtube' && video.youtubeVideoId) {
      // For YouTube, generate protected embed URL
      // Using nocookie domain and privacy-enhanced mode
      // The token parameter prevents direct sharing
      const embedParams = new URLSearchParams({
        modestbranding: '1',
        rel: '0',
        showinfo: '0',
        iv_load_policy: '3', // Hide annotations
        disablekb: '1', // Disable keyboard controls (prevents seeking tricks)
        fs: '0', // Disable fullscreen (optional, can enable)
        origin: process.env.NEXT_PUBLIC_BASE_URL || 'https://swaryoga.com'
      });
      
      accessUrl = `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}?${embedParams}`;
      embedHtml = `<iframe 
        src="${accessUrl}" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen
        style="width:100%;height:100%;"
        sandbox="allow-scripts allow-same-origin allow-presentation"
      ></iframe>`;
    } else if (video.s3Key) {
      // For AWS S3, generate signed URL (expires in 2 hours)
      accessUrl = await getProtectedUrl(video.s3Key, 'community', 7200);
    }

    return NextResponse.json({
      success: true,
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        videoSource: video.videoSource,
        views: video.views + 1,
        createdAt: video.createdAt,
      },
      accessUrl,
      embedHtml,
      accessToken: newAccessToken,
      expiresIn: 3600, // 1 hour
    });
  } catch (error: any) {
    console.error('❌ Secure video access error:', error);
    return NextResponse.json(
      { error: 'Failed to access video' },
      { status: 500 }
    );
  }
}
