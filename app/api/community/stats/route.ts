import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { COMMUNITY_DESIGNS } from '@/lib/communityColorSystem';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const communityIds = COMMUNITY_DESIGNS.map(d => d.id);

    // Single aggregation instead of N separate countDocuments calls
    const rows = await CommunityMember.aggregate([
      { $match: { communityId: { $in: communityIds }, status: 'active' } },
      { $group: { _id: '$communityId', count: { $sum: 1 } } },
    ]);

    const data: Record<string, number> = Object.fromEntries(communityIds.map(id => [id, 0]));
    rows.forEach((r: any) => { data[r._id] = r.count; });

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
