/**
 * Tally Sync Stats API
 * GET /api/tally/stats?token=YOUR_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTallySyncStats } from '@/lib/tally/tallySync';

function verifyToken(token: string): boolean {
  const validToken = process.env.TALLY_SYNC_TOKEN;
  if (!validToken) return false;
  return token === validToken;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getTallySyncStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
