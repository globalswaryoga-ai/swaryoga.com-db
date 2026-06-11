import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const maxDuration = 300; // 5 min for large videos

// ── In-memory cache for resolved CDN URLs (avoids re-calling ytdl on every range request) ──
const urlCache = new Map<string, { url: string; mime: string; exp: number }>();
const CACHE_TTL = 90 * 60 * 1000; // 90 minutes (YouTube CDN URLs expire in ~6h)

/**
 * GET /api/community/videos/stream?v=VIDEO_DB_ID&token=JWT
 *
 * Pipes the actual video stream through our server.
 * Used as fallback when CDN URL is IP-restricted (client can't fetch it directly).
 * Supports Range headers for seeking.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoDbId = searchParams.get('v');
    const token = searchParams.get('token');

    if (!videoDbId || !token) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Verify JWT
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Authentication expired' }, { status: 401 });
    }

    await connectDB();

    const { getCommunityVideo, CommunityMember } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    const video = await CommunityVideo.findById(videoDbId);
    if (!video || !video.youtubeVideoId) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Membership check (skip for admins)
    const d = decoded as any;
    const trustedTemp = d.tempToken === true && d.communityId && d.communityId === video.communityId;
    if (!d.isAdmin && !trustedTemp) {
      const orConds: any[] = [
        { userId: decoded.userId },
        { mobile: decoded.userId },
      ];
      if (d.email) {
        orConds.push({ email: d.email });
        orConds.push({ userId: d.email });
      }
      const membership = await CommunityMember.findOne({
        communityId: video.communityId,
        $or: orConds,
        status: 'active',
      });
      if (!membership) {
        return NextResponse.json({ error: 'Membership required' }, { status: 403 });
      }
    }

    // ── Resolve CDN URL (with cache) ──
    const cacheKey = video.youtubeVideoId;
    let videoUrl: string;
    let mimeType: string;

    const cached = urlCache.get(cacheKey);
    if (cached && Date.now() < cached.exp) {
      videoUrl = cached.url;
      mimeType = cached.mime;
    } else {
      const ytdl = (await import('@distube/ytdl-core')).default;
      const { getYouTubeAgent } = await import('@/lib/youtube-auth');
      const agent = await getYouTubeAgent();
      const watchUrl = `https://www.youtube.com/watch?v=${video.youtubeVideoId}`;
      const info = agent
        ? await ytdl.getInfo(watchUrl, { agent })
        : await ytdl.getInfo(watchUrl);
      const fmt =
        ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' }) ||
        ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });

      if (!fmt?.url) {
        return NextResponse.json({ error: 'Video stream unavailable' }, { status: 503 });
      }

      videoUrl = fmt.url;
      mimeType = fmt.mimeType?.split(';')[0] || 'video/mp4';
      urlCache.set(cacheKey, { url: videoUrl, mime: mimeType, exp: Date.now() + CACHE_TTL });
    }

    // ── Proxy the video bytes through our server ──
    const rangeHeader = request.headers.get('range');
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const videoResponse = await fetch(videoUrl, { headers: fetchHeaders });

    if (!videoResponse.ok && videoResponse.status !== 206) {
      // URL may have expired — clear cache and fail
      urlCache.delete(cacheKey);
      return NextResponse.json({ error: 'Stream fetch failed' }, { status: 502 });
    }

    // Build response headers
    const resHeaders: Record<string, string> = {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=120',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    };

    const contentLength = videoResponse.headers.get('content-length');
    const contentRange = videoResponse.headers.get('content-range');
    if (contentLength) resHeaders['Content-Length'] = contentLength;
    if (contentRange) resHeaders['Content-Range'] = contentRange;

    // Increment view count (only on initial non-range request)
    if (!rangeHeader) {
      await CommunityVideo.findByIdAndUpdate(videoDbId, { $inc: { views: 1 } });
    }

    return new NextResponse(videoResponse.body, {
      status: videoResponse.status === 206 ? 206 : 200,
      headers: resHeaders,
    });
  } catch (error: any) {
    console.error('[Video Stream] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Video streaming unavailable. Please try again.' },
      { status: 500 }
    );
  }
}
