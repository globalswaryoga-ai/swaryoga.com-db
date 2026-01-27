/**
 * Workshop Community Merge API
 * 
 * POST - Merge workshop community into Old Sadhak community
 * Called when a workshop is marked as complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { mergeWorkshopCommunity } from '@/lib/community-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { workshopId } = await params;

    if (!workshopId) {
      return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 });
    }

    // Merge the workshop community
    const result = await mergeWorkshopCommunity(workshopId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to merge community' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Workshop community merged into Old Sadhak successfully',
      membersTransferred: result.membersTransferred,
      videosTransferred: result.videosTransferred,
    });
  } catch (error) {
    console.error('Error merging community:', error);
    return NextResponse.json(
      { error: 'Failed to merge community' },
      { status: 500 }
    );
  }
}
