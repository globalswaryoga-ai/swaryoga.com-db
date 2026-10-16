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
 * GET /api/community/tips
 * Fetch answered tips (public) or all (admin)
 */
export async function GET(request: NextRequest) {
  try {
    await initCommunitySchema();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'answered';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const mappedStatus = status === 'answered' ? 'approved' : status;
    const tips = await listModerationItems('tip', mappedStatus, limit);
    const pendingCount = await countModerationPending('tip');

    // Category counts
    const catRes = await bunnyExecute({
      sql: `SELECT community_id as _id, COUNT(*) as count 
            FROM community_moderation_sql 
            WHERE type = 'tip' AND status = 'approved'
            GROUP BY community_id`,
    });

    return NextResponse.json({
      success: true,
      tips: tips.map((t) => ({
        ...t,
        issue: t.content,
        tip: t.rawDoc?.tip || '',
      })),
      categories: catRes.rows,
      pendingCount,
    });
  } catch (error) {
    console.error('[Tips] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tips',
    }, { status: 500 });
  }
}

/**
 * POST /api/community/tips
 * Submit a new issue (request for tip)
 */
export async function POST(request: NextRequest) {
  try {
    await initCommunitySchema();

    const body = await request.json();
    const { userName, issue, category, communityId, userPhone, userEmail } = body;

    if (!userName?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!issue?.trim()) {
      return NextResponse.json({ success: false, error: 'Please describe your issue' }, { status: 400 });
    }

    const newTip = await createModerationItem({
      type: 'tip',
      userName: userName.trim(),
      userPhone,
      userEmail,
      content: issue.trim(),
      communityId: communityId || category || 'global',
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      message: 'Your issue has been submitted! Our experts will provide tips soon.',
      tip: {
        _id: newTip._id,
        status: newTip.status,
      },
    });
  } catch (error) {
    console.error('[Tips] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit issue',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/community/tips
 * Admin: Provide tip or reject
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
    const { tipId, tip, action, featured } = body;

    if (!tipId) {
      return NextResponse.json({ success: false, error: 'Tip ID required' }, { status: 400 });
    }

    await initCommunitySchema();

    let newStatus = 'approved';
    if (action === 'reject') newStatus = 'rejected';

    await bunnyExecute({
      sql: `UPDATE community_moderation_sql 
            SET status = ?, 
                featured = COALESCE(?, featured),
                raw_doc_json = json_set(raw_doc_json, '$.tip', ?),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [newStatus, typeof featured === 'boolean' ? (featured ? 1 : 0) : null, tip ? tip.trim() : '', tipId],
    });

    const res = await bunnyExecute({
      sql: 'SELECT * FROM community_moderation_sql WHERE id = ? LIMIT 1',
      args: [tipId],
    });
    const updated = res.rows[0];

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Tip not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: tip ? 'Tip provided!' : 'Tip updated',
      tip: {
        _id: updated.id,
        id: updated.id,
        issue: updated.content,
        status: updated.status,
        featured: Boolean(updated.featured),
      },
    });
  } catch (error) {
    console.error('[Tips] PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update tip',
    }, { status: 500 });
  }
}
