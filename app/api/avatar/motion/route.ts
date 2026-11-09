import { NextRequest, NextResponse } from 'next/server';
import { getAllMotionProfiles, getMotionsByCategory } from '@/lib/avatarEngine/motionService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category') || undefined;
    const motions = category
      ? await getMotionsByCategory(category)
      : await getAllMotionProfiles();

    return NextResponse.json({
      success: true,
      total: motions.length,
      motions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch motion profiles' },
      { status: 500 }
    );
  }
}
