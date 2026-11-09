import { NextRequest, NextResponse } from 'next/server';
import { getAllMotionProfiles, getMotionsByCategory, createMotionProfile } from '@/lib/avatarEngine/motionService';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(req));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }
  const viewerId = getViewerUserId(decoded);
  if (!viewerId) {
    return NextResponse.json({ success: false, error: 'Admin identity is missing.' }, { status: 401 });
  }

  try {
    const filterUserId = isSuperAdmin(decoded) ? undefined : viewerId;
    const category = req.nextUrl.searchParams.get('category') || undefined;
    const motions = category
      ? await getMotionsByCategory(category, filterUserId)
      : await getAllMotionProfiles(filterUserId);

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

export async function POST(req: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(req));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }
  const viewerId = getViewerUserId(decoded);
  if (!viewerId) {
    return NextResponse.json({ success: false, error: 'Admin identity is missing.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      motionName,
      motionCategory,
      loopable,
      durationSeconds,
      fps,
      keyframeCount,
      applicablePoses,
      description,
      animationClipUrl,
    } = body;

    if (!motionName || !motionCategory) {
      return NextResponse.json(
        { success: false, error: 'motionName and motionCategory are required.' },
        { status: 400 }
      );
    }

    const newMotion = await createMotionProfile({
      userId: viewerId,
      motionName,
      motionCategory,
      loopable,
      durationSeconds,
      fps,
      keyframeCount,
      applicablePoses,
      description,
      animationClipUrl,
    });

    return NextResponse.json({
      success: true,
      motion: newMotion,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create motion profile' },
      { status: 500 }
    );
  }
}
