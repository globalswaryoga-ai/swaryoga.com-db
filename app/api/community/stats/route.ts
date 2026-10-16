import { NextRequest, NextResponse } from 'next/server';
import { getCommunityStats } from '@/lib/bunnyCommunityRepository';
import { COMMUNITY_DESIGNS } from '@/lib/communityColorSystem';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const communityIds = COMMUNITY_DESIGNS.map((d) => d.id);
    const stats = await getCommunityStats();

    const data: Record<string, number> = Object.fromEntries(communityIds.map((id) => [id, 0]));
    for (const [cId, count] of Object.entries(stats)) {
      data[cId] = count;
    }

    return NextResponse.json(
      { success: true, data },
      {
        status: 200,
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
      }
    );
  } catch (error) {
    console.error('Failed to get community stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get community stats' },
      { status: 500 }
    );
  }
}
