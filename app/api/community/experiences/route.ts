import { NextRequest, NextResponse } from 'next/server';
import {
  initCommunitySchema,
  listModerationItems,
  countModerationPending,
  createModerationItem,
  updateModerationItem,
} from '@/lib/bunnyCommunityRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/experiences
 * Fetch approved experiences (public) or all (admin)
 */
export async function GET(request: NextRequest) {
  try {
    await initCommunitySchema();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'approved';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const experiences = await listModerationItems('experience', status, limit);
    const pendingCount = await countModerationPending('experience');

    // Calculate rating stats
    const statsRes = await bunnyExecute({
      sql: `SELECT 
              COUNT(*) as totalCount,
              AVG(rating) as avgRating,
              SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as fiveStars,
              SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as fourStars,
              SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as threeStars,
              SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as twoStars,
              SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as oneStars
            FROM community_moderation_sql 
            WHERE type = 'experience' AND status = 'approved'`,
    });

    const s = statsRes.rows[0] || {};
    const stats = {
      avgRating: Number(s.avgRating || 5),
      totalCount: Number(s.totalCount || 0),
      fiveStars: Number(s.fiveStars || 0),
      fourStars: Number(s.fourStars || 0),
      threeStars: Number(s.threeStars || 0),
      twoStars: Number(s.twoStars || 0),
      oneStars: Number(s.oneStars || 0),
    };

    return NextResponse.json({
      success: true,
      experiences,
      pendingCount,
      stats,
    });
  } catch (error) {
    console.error('[Experiences] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch experiences',
    }, { status: 500 });
  }
}

/**
 * POST /api/community/experiences
 * Submit a new experience
 */
export async function POST(request: NextRequest) {
  try {
    await initCommunitySchema();

    const body = await request.json();
    const { userName, content, rating, photoUrl, communityId, userPhone, userEmail } = body;

    if (!userName?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: 'Experience content is required' }, { status: 400 });
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: 'Rating must be 1-5 stars' }, { status: 400 });
    }

    const experience = await createModerationItem({
      type: 'experience',
      userName: userName.trim(),
      userPhone,
      userEmail,
      content: content.trim(),
      rating: Math.round(rating),
      photoUrl,
      communityId: communityId || 'global',
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your experience has been submitted for review.',
      experience: {
        _id: experience._id,
        status: experience.status,
      },
    });
  } catch (error) {
    console.error('[Experiences] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit experience',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/community/experiences
 * Admin: Approve/reject experience
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { verifyToken } = await import('@/lib/auth');
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { experienceId, action, featured } = body;

    if (!experienceId) {
      return NextResponse.json({ success: false, error: 'Experience ID required' }, { status: 400 });
    }

    const updates: { status?: string; featured?: boolean } = {};
    if (action === 'approve') {
      updates.status = 'approved';
    } else if (action === 'reject') {
      updates.status = 'rejected';
    }

    if (typeof featured === 'boolean') {
      updates.featured = featured;
    }

    const updated = await updateModerationItem(experienceId, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Experience not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Experience approved!' : 'Experience updated',
      experience: updated,
    });
  } catch (error) {
    console.error('[Experiences] PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update experience',
    }, { status: 500 });
  }
}
