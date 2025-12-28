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
        // Count members from CommunityMember collection (actual members)
        const memberCount = await CommunityMember.countDocuments({ 
          communityId: id,
          status: 'active' // Only count active members
        });
        return { id, count: memberCount };
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
