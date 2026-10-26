import { NextRequest, NextResponse } from 'next/server';
import { submitAvatarVideo, checkVideoStatus } from '@/lib/aiVideo/heygen';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      avatarId = '11236c340a0f4ece98638134c021b166', // Mohan Kalburgi
      voiceId = '158e3393fea441679e6ecb87b03b8921',  // Mohan Sir Voice
      script,
      avatarType = 'avatar',
      width = 1920,
      height = 1080,
    } = body;

    if (!script || !script.trim()) {
      return NextResponse.json({ error: 'Script text is required for HeyGen video rendering.' }, { status: 400 });
    }

    const videoId = await submitAvatarVideo({
      avatarId,
      voiceId,
      script: script.trim(),
      avatarType,
      width,
      height,
    });

    return NextResponse.json({
      success: true,
      videoId,
      message: 'HeyGen HD video render job started successfully.',
    });
  } catch (error: any) {
    console.error('HeyGen render error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit HeyGen video render.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const status = await checkVideoStatus(videoId);
    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error('HeyGen status check error:', error);
    return NextResponse.json({ error: error.message || 'Failed to check HeyGen video status.' }, { status: 500 });
  }
}
