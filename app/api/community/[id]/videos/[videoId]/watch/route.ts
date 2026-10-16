import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCommunitySchema, getCommunityVideo } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';

function getYearKey(now = new Date()): string {
  return String(now.getFullYear());
}

/**
 * GET /api/community/[id]/videos/[videoId]/watch?userId=...
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    await initCommunitySchema();
    const { id: communityId, videoId } = await params;
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const memberRes = await bunnyExecute({
      sql: 'SELECT * FROM community_members_sql WHERE community_id = ? AND user_id = ? LIMIT 1',
      args: [communityId, userId],
    });
    const member = memberRes.rows[0];

    // If global, allow any user
    if (!member && communityId !== 'global') {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 });
    }

    if (member && member.status !== 'active') {
      return NextResponse.json(
        { error: 'Video access suspended', suspended: true, reason: 'Access suspended' },
        { status: 403 }
      );
    }

    const video = await getCommunityVideo(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const watchLogId = crypto.randomUUID();
    const yearKey = getYearKey();

    return NextResponse.json({
      success: true,
      watchLogId,
      quota: { totalSecondsPerYear: null, perVideoSecondsPerYear: null },
      usage: {
        totalSeconds: 0,
        videoSeconds: 0,
      },
    });
  } catch (error: any) {
    console.error('[Community Video Watch GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/community/[id]/videos/[videoId]/watch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    await initCommunitySchema();
    const { id: communityId, videoId } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const { userId, watchLogId } = body;
    const watchedSeconds = Math.max(0, Math.min(120, Number(body.watchedSeconds) || 0));

    if (!userId || !watchLogId) {
      return NextResponse.json({ error: 'userId and watchLogId are required' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      suspended: false,
      usage: {
        totalSeconds: watchedSeconds,
        videoSeconds: watchedSeconds,
      },
    });
  } catch (error: any) {
    console.error('[Community Video Watch POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
