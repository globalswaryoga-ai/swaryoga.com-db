import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const communityIds = ['global', 'swar-yoga', 'aham-bramhasmi', 'astavakra', 'shivoham', 'i-am-fit'];
    
    const stats = await Promise.all(
      communityIds.map(async (id) => {
        try {
          // Count members from CommunityMember collection (actual members)
          const memberCount = await CommunityMember.countDocuments({ 
            communityId: id,
            status: 'active' // Only count active members
          });
          console.log(`✅ Community ${id}: ${memberCount} active members`);
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

    console.log('📊 Final stats:', data);

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
