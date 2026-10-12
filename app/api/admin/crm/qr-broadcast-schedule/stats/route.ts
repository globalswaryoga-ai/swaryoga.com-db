import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getBunnyQrBroadcastSchedule } from '@/lib/bunnyQrBroadcastScheduleRepository';
import { getBunnyMessageDedupStats } from '@/lib/messageDeduplication';

export const dynamic = 'force-dynamic';

function getUserId(decoded: any): string | null {
  return decoded?.userId || decoded?.username || decoded?.id || null;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const scheduleId = new URL(req.url).searchParams.get('scheduleId');
    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId parameter required' }, { status: 400 });
    }

    const userId = getUserId(decoded);
    if (!userId) return NextResponse.json({ error: 'Admin identity required' }, { status: 403 });

    const schedule = await getBunnyQrBroadcastSchedule(scheduleId, userId);
    if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

    const stats = await getBunnyMessageDedupStats(scheduleId);
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('[QR Broadcast Stats]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
