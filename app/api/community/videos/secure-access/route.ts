import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getProtectedUrl } from '@/lib/aws-s3';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCommunitySchema, getCommunityVideo } from '@/lib/bunnyCommunityRepository';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const VIDEO_ACCESS_SECRET = process.env.JWT_SECRET || 'fallback-video-secret';

function generateVideoAccessToken(userId: string, videoId: string): string {
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  const payload = `${userId}:${videoId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', VIDEO_ACCESS_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

function verifyVideoAccessToken(token: string, videoId: string): { valid: boolean; userId?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 4) return { valid: false };
    
    const [userId, tokenVideoId, expiresAtStr, signature] = parts;
    if (tokenVideoId !== videoId) return { valid: false };
    
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) return { valid: false };
    
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const accessToken = searchParams.get('token');
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    await initCommunitySchema();
    const video = await getCommunityVideo(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    let userId: string | undefined;
    let isAdmin = false;

    if (accessToken) {
      const tokenResult = verifyVideoAccessToken(accessToken, videoId);
      if (tokenResult.valid) {
        userId = tokenResult.userId;
      }
    }

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

      userId = String(decoded.userId);
      isAdmin = decoded.isAdmin === true;
    }

    // Check membership (unless admin or global)
    if (!isAdmin && userId && video.communityId !== 'global') {
      const memberRes = await bunnyExecute({
        sql: `SELECT 1 FROM community_members_sql 
              WHERE (community_id = ? OR community_id = 'global') 
              AND user_id = ? AND status = 'active' LIMIT 1`,
        args: [video.communityId, userId],
      });
      if (memberRes.rows.length === 0) {
        return NextResponse.json(
          { error: 'You must be a member of this community to view videos' },
          { status: 403 }
        );
      }
    }

    const raw = video.rawDoc || {};
    const views = (Number(raw.views) || 0) + 1;
    raw.views = views;
    await bunnyExecute({
      sql: 'UPDATE community_videos_sql SET raw_doc_json = ? WHERE id = ?',
      args: [JSON.stringify(raw), videoId],
    });

    const newAccessToken = generateVideoAccessToken(userId || 'anonymous', videoId);

    let accessUrl: string | null = null;
    let embedHtml: string | null = null;

    if (raw.videoSource === 'youtube' && raw.youtubeVideoId) {
      const authHeader = request.headers.get('authorization');
      const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
      accessUrl = `/api/community/videos/embed?v=${videoId}&token=${jwtToken}`;
      embedHtml = `<div style="position:relative;width:100%;height:100%;" oncontextmenu="return false;"><iframe 
        src="${accessUrl}" 
        frameborder="0" 
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
        referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        style="width:100%;height:100%;"
      ></iframe></div>`;
    } else if (video.s3Key) {
      accessUrl = await getProtectedUrl(video.s3Key, 'community', 7200);
    }

    return NextResponse.json({
      success: true,
      video: {
        _id: video.id,
        id: video.id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        videoSource: raw.videoSource || 'aws',
        views,
        createdAt: video.createdAt,
      },
      accessUrl,
      embedHtml,
      accessToken: newAccessToken,
      expiresIn: 3600,
    });
  } catch (error: any) {
    console.error('❌ Secure video access error:', error);
    return NextResponse.json(
      { error: 'Failed to access video' },
      { status: 500 }
    );
  }
}
