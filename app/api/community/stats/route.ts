import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Community } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const communityIds = ['global', 'swar-yoga', 'aham-bramhasmi', 'astavakra', 'shivoham', 'i-am-fit'];
    
    const stats = await Promise.all(
      communityIds.map(async (id) => {
        const community = await Community.findOne({ name: mapIdToName(id) }).lean();
        const memberCount = community?.members?.length || 0;
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

function mapIdToName(id: string): string {
  const mapping: Record<string, string> = {
    'global': 'Global Community',
    'swar-yoga': 'Swar Yoga',
    'aham-bramhasmi': 'Aham Bramhasmi',
    'astavakra': 'Astavakra',
    'shivoham': 'Shivoham',
    'i-am-fit': 'I am Fit',
  };
  return mapping[id] || id;
}
