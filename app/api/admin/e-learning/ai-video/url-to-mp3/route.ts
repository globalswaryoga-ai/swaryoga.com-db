import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (ytdl.validateURL(url)) {
      // It's a YouTube URL, extract audio directly
      const stream = ytdl(url, { filter: 'audioonly' });
      
      // We can stream it directly to the response
      return new NextResponse(stream as any, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': 'attachment; filename="youtube_audio.mp3"'
        }
      });
    } else {
      // It's likely a direct MP4 link from Bunny or elsewhere
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch the URL');
      }
      
      // Return the video stream to the client, the client will FFmpeg it
      return new NextResponse(res.body, {
        headers: {
          'Content-Type': res.headers.get('content-type') || 'video/mp4',
        }
      });
    }
  } catch (error: any) {
    console.error('[url-to-mp3] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process URL' }, { status: 500 });
  }
}
