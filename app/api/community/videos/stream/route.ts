import { NextRequest, NextResponse } from 'next/server';
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

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Authentication expired' }, { status: 401 });
    }

    const { getCommunityVideo } = await import('@/lib/bunnyCommunityRepository');
    const { bunnyExecute } = await import('@/lib/bunnyDatabase');

    const video = await getCommunityVideo(videoDbId);
    const raw = video?.rawDoc || {};
    const youtubeVideoId = raw.youtubeVideoId || (video?.s3Key?.startsWith('youtube:') ? video.s3Key.slice('youtube:'.length) : null);
    if (!video || !youtubeVideoId) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Membership check (skip for admins)
    const d = decoded as any;
    const trustedTemp = d.tempToken === true && d.communityId && d.communityId === video.communityId;
    if (!d.isAdmin && !trustedTemp && video.communityId !== 'global') {
      const orConds = [String(decoded.userId)];
      if (d.email) orConds.push(String(d.email));
      const placeholders = orConds.map(() => '?').join(',');
      const memRes = await bunnyExecute({
        sql: `SELECT 1 FROM community_members_sql 
              WHERE community_id = ? AND (user_id IN (${placeholders}) OR email IN (${placeholders}) OR mobile IN (${placeholders}))
              AND status = 'active' LIMIT 1`,
        args: [video.communityId, ...orConds, ...orConds, ...orConds],
      });
      if (memRes.rows.length === 0) {
        return NextResponse.json({ error: 'Membership required' }, { status: 403 });
      }
    }

    // ── Resolve CDN URL (with cache) ──
    const cacheKey = youtubeVideoId;
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
      const watchUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
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
      await bunnyExecute({
        sql: "UPDATE community_videos_sql SET raw_doc_json = json_set(raw_doc_json, '$.views', COALESCE(json_extract(raw_doc_json, '$.views'), 0) + 1) WHERE id = ?",
        args: [videoDbId],
      }).catch(() => {});
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
