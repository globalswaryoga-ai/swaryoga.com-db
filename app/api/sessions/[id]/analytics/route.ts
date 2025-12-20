import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ViewTracking, Purchase, Session } from '@/lib/schemas/recordedSessionsSchemas';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * GET /api/sessions/[id]/analytics
 * Get analytics for a specific session (admin only)
 * Returns: views, purchases, completion rate, average watch time
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    // Get session details
    const session = await Session.findById(params.id).lean() as any;
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get purchase stats
    const purchaseStats = await Purchase.aggregate([
      { $match: { session_id: mongoose.Types.ObjectId.createFromHexString(params.id), status: 'completed' } },
      {
        $group: {
          _id: null,
          total_purchases: { $sum: 1 },
          total_revenue: { $sum: '$amount' },
          one_time: {
            $sum: { $cond: [{ $eq: ['$subscription_type', 'one-time'] }, 1, 0] },
          },
          monthly: { $sum: { $cond: [{ $eq: ['$subscription_type', 'monthly'] }, 1, 0] } },
          yearly: { $sum: { $cond: [{ $eq: ['$subscription_type', 'yearly'] }, 1, 0] } },
        },
      },
    ]);

    // Get view/completion stats
    const viewStats = await ViewTracking.aggregate([
      { $match: { session_id: mongoose.Types.ObjectId.createFromHexString(params.id) } },
      {
        $group: {
          _id: null,
          total_views: { $sum: '$watch_count' },
          unique_viewers: { $sum: 1 },
          completed_count: { $sum: { $cond: ['$is_completed', 1, 0] } },
          avg_watch_duration: { $avg: '$watched_duration' },
          total_watch_time: { $sum: '$watched_duration' },
        },
      },
    ]);

    const purchases = purchaseStats[0] || {
      total_purchases: 0,
      total_revenue: 0,
      one_time: 0,
      monthly: 0,
      yearly: 0,
    };

    const views = viewStats[0] || {
      total_views: 0,
      unique_viewers: 0,
      completed_count: 0,
      avg_watch_duration: 0,
      total_watch_time: 0,
    };

    const completionRate =
      views.unique_viewers > 0
        ? ((views.completed_count / views.unique_viewers) * 100).toFixed(1)
        : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          session: {
            id: session._id,
            title: session.title,
            price: session.price,
            total_views: session.views,
          },
          purchases: {
            ...purchases,
            avg_revenue_per_purchase:
              purchases.total_purchases > 0
                ? (purchases.total_revenue / purchases.total_purchases).toFixed(2)
                : 0,
          },
          views: {
            ...views,
            avg_watch_time_minutes: (
              views.avg_watch_duration / 60
            ).toFixed(1),
            total_watch_hours: (views.total_watch_time / 3600).toFixed(1),
            completion_rate: `${completionRate}%`,
          },
          revenue_per_view: (
            purchases.total_revenue / (session.views || 1)
          ).toFixed(4),
        },
      },
      { status: 200, headers: { 'Cache-Control': 'private, max-age=300' } }
    );
  } catch (error: any) {
    console.error('GET /api/sessions/[id]/analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
