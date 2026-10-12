import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { updateBunnyQrBroadcastSchedule } from '@/lib/bunnyQrBroadcastScheduleRepository';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userId = decoded?.userId || decoded?.username || decoded?.id || 'admin';
    const schedule = await updateBunnyQrBroadcastSchedule(params.id, userId, {
        isActive: false,
        status: 'paused',
      });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule paused',
      data: schedule
    });
  } catch (error) {
    console.error('[QR Broadcast Schedule Pause API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
