import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/videos/embed?v=VIDEO_DB_ID&token=JWT
 * 
 * Returns an HTML page containing the YouTube embed.
 * The YouTube video ID NEVER reaches the client JS — it only exists
 * inside this server-rendered HTML response.
 * 
 * If someone copies & shares this URL, it won't work because:
 * 1. The JWT token expires in ~2 hours
 * 2. Membership is verified on every request
 * 3. Response headers prevent caching
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoDbId = searchParams.get('v');
    const token = searchParams.get('token');

    if (!videoDbId || !token) {
      return new NextResponse(errorPage('Missing parameters'), {
        status: 400,
        headers: htmlHeaders(),
      });
    }

    // Verify JWT
    const decoded = await verifyToken(token);
    if (!decoded) {
      return new NextResponse(errorPage('Session expired. Please refresh the page.'), {
        status: 401,
        headers: htmlHeaders(),
      });
    }

    await connectDB();

    const { getCommunityVideo, CommunityMembership } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    // Find the video by DB _id
    const video = await CommunityVideo.findById(videoDbId);
    if (!video || !video.youtubeVideoId) {
      return new NextResponse(errorPage('Video not found'), {
        status: 404,
        headers: htmlHeaders(),
      });
    }

    // Check membership (unless admin)
    const isAdmin = (decoded as any).isAdmin === true;
    if (!isAdmin) {
      const decodedAny = decoded as any;
      const membership = await CommunityMembership.findOne({
        communityId: video.communityId,
        $or: [
          { odId: decodedAny.odId },
          { odId: decoded.userId },
          { userId: decoded.userId },
        ],
        status: 'active',
      });

      if (!membership) {
        return new NextResponse(errorPage('Access denied. You must be a community member.'), {
          status: 403,
          headers: htmlHeaders(),
        });
      }
    }

    // Increment view count
    await CommunityVideo.findByIdAndUpdate(videoDbId, { $inc: { views: 1 } });

    // Build the embed URL — this only exists in the server-rendered HTML
    const embedUrl = `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1`;

    // Return HTML page with the YouTube embed
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Swar Yoga - Video Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    iframe { width: 100%; height: 100%; border: none; }
    /* Block text selection and drag */
    body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  </style>
  <script>
    // Disable right-click
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    // Disable view-source shortcuts
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 's' || e.key === 'U' || e.key === 'S')) {
        e.preventDefault();
      }
      if (e.key === 'F12') e.preventDefault();
    });
  </script>
</head>
<body>
  <iframe
    src="${embedUrl}"
    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
    referrerpolicy="no-referrer"
    sandbox="allow-scripts allow-same-origin allow-presentation"
  ></iframe>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: htmlHeaders(),
    });
  } catch (error: any) {
    console.error('❌ Video embed proxy error:', error);
    return new NextResponse(errorPage('Failed to load video'), {
      status: 500,
      headers: htmlHeaders(),
    });
  }
}

/** No-cache HTML response headers */
function htmlHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

/** Simple error page HTML */
function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center; background:#111; color:#fff; font-family:system-ui; }
    .msg { text-align:center; }
    .msg h2 { font-size:1.2rem; margin-bottom:0.5rem; }
    .msg p { opacity:0.6; font-size:0.85rem; }
  </style>
</head>
<body>
  <div class="msg">
    <h2>🔒 ${message}</h2>
    <p>This video is for Swar Yoga community members only.</p>
  </div>
</body>
</html>`;
}
