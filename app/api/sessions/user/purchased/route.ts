import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Purchase, Session, ViewTracking } from '@/lib/schemas/recordedSessionsSchemas';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions/user/purchased
 * Get all sessions purchased by current user with progress
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    // Get user's purchases with session details and progress
    const purchases = await Purchase.aggregate([
      { $match: { user_id: decoded.userId, status: 'completed' } },
      {
        $lookup: {
          from: 'sessions',
          localField: 'session_id',
          foreignField: '_id',
          as: 'session',
        },
      },
      { $unwind: '$session' },
      {
        $lookup: {
          from: 'viewtrackings',
          localField: 'session_id',
          foreignField: 'session_id',
          as: 'progress',
        },
      },
      { $unwind: { path: '$progress', preserveNullAndEmptyArrays: true } },
      { $sort: { purchase_date: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          purchase_id: '$_id',
          session: {
            id: '$session._id',
            title: '$session.title',
            description: '$session.description',
            thumbnail: '$session.thumbnail',
            duration: '$session.duration',
            category: '$session.category',
            level: '$session.level',
            instructor: '$session.instructor',
          },
          purchase_date: 1,
          progress: {
            watched_duration: { $ifNull: ['$progress.watched_duration', 0] },
            total_duration: { $ifNull: ['$progress.total_duration', 0] },
            is_completed: { $ifNull: ['$progress.is_completed', false] },
            last_watched: { $ifNull: ['$progress.last_watched', null] },
            last_position: { $ifNull: ['$progress.last_position', 0] },
          },
        },
      },
    ]);

    // Calculate percentage for each
    const enrichedPurchases = purchases.map((p) => ({
      ...p,
      progress: {
        ...p.progress,
        percentage_watched:
          p.progress.total_duration > 0
            ? Math.round(
                (p.progress.watched_duration / p.progress.total_duration) * 100
              )
            : 0,
      },
    }));

    const total = await Purchase.countDocuments({
      user_id: decoded.userId,
      status: 'completed',
    });

    return NextResponse.json(
      {
        success: true,
        data: enrichedPurchases,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  } catch (error: any) {
    console.error('GET /api/sessions/user/purchased error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
