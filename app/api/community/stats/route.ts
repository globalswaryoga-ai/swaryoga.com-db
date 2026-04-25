import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { COMMUNITY_DESIGNS } from '@/lib/communityColorSystem';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Use canonical community IDs from the design system (single source of truth)
    const communityIds = COMMUNITY_DESIGNS.map(d => d.id);
    
    const stats = await Promise.all(
      communityIds.map(async (id) => {
        try {
          // Count members from CommunityMember collection (actual members)
          const memberCount = await CommunityMember.countDocuments({ 
            communityId: id,
            status: 'active'
          });
          return { id, count: memberCount };
        } catch (err) {
          console.error(`❌ Error counting members for ${id}:`, err);
          return { id, count: 0 };
        }
      })
    );

    const data: Record<string, number> = {};
    stats.forEach((stat) => {
      data[stat.id] = stat.count;
    });

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to get community stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get community stats' },
      { status: 500 }
    );
  }
}
