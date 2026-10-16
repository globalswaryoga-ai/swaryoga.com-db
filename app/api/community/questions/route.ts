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
 * GET /api/community/questions
 * Fetch answered questions (public) or all (admin)
 */
export async function GET(request: NextRequest) {
  try {
    await initCommunitySchema();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'answered';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // In community_moderation_sql, 'approved' or 'answered' represent live questions
    const mappedStatus = status === 'answered' ? 'approved' : status;
    const questions = await listModerationItems('question', mappedStatus, limit);
    const pendingCount = await countModerationPending('question');

    // Category counts
    const catRes = await bunnyExecute({
      sql: `SELECT community_id as _id, COUNT(*) as count 
            FROM community_moderation_sql 
            WHERE type = 'question' AND status = 'approved'
            GROUP BY community_id`,
    });

    return NextResponse.json({
      success: true,
      questions: questions.map((q) => ({
        ...q,
        question: q.content,
        answer: q.rawDoc?.answer || '',
      })),
      categories: catRes.rows,
      pendingCount,
    });
  } catch (error) {
    console.error('[Questions] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch questions',
    }, { status: 500 });
  }
}

/**
 * POST /api/community/questions
 * Submit a new question
 */
export async function POST(request: NextRequest) {
  try {
    await initCommunitySchema();

    const body = await request.json();
    const { userName, question, category, communityId, userPhone, userEmail } = body;

    if (!userName?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!question?.trim()) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }

    const newQuestion = await createModerationItem({
      type: 'question',
      userName: userName.trim(),
      userPhone,
      userEmail,
      content: question.trim(),
      communityId: communityId || category || 'global',
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      message: 'Your question has been submitted! We\'ll answer it soon.',
      question: {
        _id: newQuestion._id,
        status: newQuestion.status,
      },
    });
  } catch (error) {
    console.error('[Questions] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit question',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/community/questions
 * Admin: Answer or reject question
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
    const { questionId, answer, action, featured } = body;

    if (!questionId) {
      return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });
    }

    await initCommunitySchema();

    let newStatus = 'approved';
    if (action === 'reject') newStatus = 'rejected';

    await bunnyExecute({
      sql: `UPDATE community_moderation_sql 
            SET status = ?, 
                featured = COALESCE(?, featured),
                raw_doc_json = json_set(raw_doc_json, '$.answer', ?),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [newStatus, typeof featured === 'boolean' ? (featured ? 1 : 0) : null, answer ? answer.trim() : '', questionId],
    });

    const res = await bunnyExecute({
      sql: 'SELECT * FROM community_moderation_sql WHERE id = ? LIMIT 1',
      args: [questionId],
    });
    const updated = res.rows[0];

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: answer ? 'Question answered!' : 'Question updated',
      question: {
        _id: updated.id,
        id: updated.id,
        question: updated.content,
        status: updated.status,
        featured: Boolean(updated.featured),
      },
    });
  } catch (error) {
    console.error('[Questions] PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update question',
    }, { status: 500 });
  }
}
