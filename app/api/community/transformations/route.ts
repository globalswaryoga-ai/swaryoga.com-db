import { NextRequest, NextResponse } from 'next/server';
import {
  initCommunitySchema,
  listModerationItems,
  countModerationPending,
  createModerationItem,
} from '@/lib/bunnyCommunityRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/transformations
 * Fetch approved transformations (public) or all (admin)
 */
export async function GET(request: NextRequest) {
  try {
    await initCommunitySchema();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'approved';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const transformations = await listModerationItems('transformation', status, limit);
    const pendingCount = await countModerationPending('transformation');

    // Stats
    const statsRes = await bunnyExecute({
      sql: `SELECT COUNT(*) as totalCount FROM community_moderation_sql 
            WHERE type = 'transformation' AND status = 'approved'`,
    });

    const totalCount = Number(statsRes.rows[0]?.totalCount || 0);

    return NextResponse.json({
      success: true,
      transformations: transformations.map((t) => ({
        ...t,
        title: t.rawDoc?.title || t.content?.slice(0, 40) || 'Transformation Story',
        story: t.content,
        beforePhoto: t.rawDoc?.beforePhoto || t.photoUrl,
        afterPhoto: t.rawDoc?.afterPhoto || null,
        duration: t.rawDoc?.duration || '',
        healthCondition: t.rawDoc?.healthCondition || '',
        yogaPractice: t.rawDoc?.yogaPractice || '',
      })),
      stats: { totalCount, withPhotos: 0 },
      pendingCount,
    });
  } catch (error) {
    console.error('[Transformations] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transformations',
    }, { status: 500 });
  }
}

/**
 * POST /api/community/transformations
 * Submit a new transformation story
 */
export async function POST(request: NextRequest) {
  try {
    await initCommunitySchema();

    const body = await request.json();
    const { 
      userName, title, story, beforePhoto, afterPhoto, 
      duration, healthCondition, yogaPractice, communityId, userPhone, userEmail 
    } = body;

    if (!userName?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!story?.trim()) {
      return NextResponse.json({ success: false, error: 'Please share your transformation story' }, { status: 400 });
    }

    const newTransformation = await createModerationItem({
      type: 'transformation',
      userName: userName.trim(),
      userPhone,
      userEmail,
      content: story.trim(),
      photoUrl: beforePhoto || afterPhoto || null,
      communityId: communityId || 'global',
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      message: 'Your transformation story has been submitted! We\'ll review and publish it soon.',
      transformation: {
        _id: newTransformation._id,
        status: newTransformation.status,
      },
    });
  } catch (error) {
    console.error('[Transformations] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit transformation',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/community/transformations
 * Admin: Approve/reject/feature transformation
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
    const { transformationId, action, featured } = body;

    if (!transformationId) {
      return NextResponse.json({ success: false, error: 'Transformation ID required' }, { status: 400 });
    }

    await initCommunitySchema();

    let newStatus = 'approved';
    if (action === 'reject') newStatus = 'rejected';

    await bunnyExecute({
      sql: `UPDATE community_moderation_sql 
            SET status = ?, 
                featured = COALESCE(?, featured),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [newStatus, typeof featured === 'boolean' ? (featured ? 1 : 0) : null, transformationId],
    });

    const res = await bunnyExecute({
      sql: 'SELECT * FROM community_moderation_sql WHERE id = ? LIMIT 1',
      args: [transformationId],
    });
    const updated = res.rows[0];

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Transformation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Transformation approved!' : 'Transformation updated',
      transformation: {
        _id: updated.id,
        id: updated.id,
        status: updated.status,
        featured: Boolean(updated.featured),
      },
    });
  } catch (error) {
    console.error('[Transformations] PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update transformation',
    }, { status: 500 });
  }
}
