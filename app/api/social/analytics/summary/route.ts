import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { PostAnalytics, Post } from '@/lib/schemas/socialMediaSchemas';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * GET /api/social/analytics/summary
 * Get overall analytics for all posts of current user
 * Shows performance across all platforms
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all user's published posts
    const userPosts = await Post.find({
      user_id: decoded.userId,
      status: 'published',
    })
      .select('_id')
      .lean();

    const postIds = userPosts.map((p) => p._id);

    if (postIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            total_posts: 0,
            total_platforms: 0,
            by_platform: {},
            totals: {
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              clicks: 0,
              avg_engagement_rate: 0,
            },
          },
        },
        { status: 200 }
      );
    }

    // Aggregate analytics across all posts and platforms
    const stats = await PostAnalytics.aggregate([
      {
        $match: {
          post_id: { $in: postIds },
        },
      },
      {
        $group: {
          _id: '$platform',
          posts_count: { $sum: 1 },
          total_views: { $sum: '$views' },
          total_likes: { $sum: '$likes' },
          total_comments: { $sum: '$comments' },
          total_shares: { $sum: '$shares' },
          total_clicks: { $sum: '$clicks' },
          avg_engagement_rate: { $avg: '$engagement_rate' },
        },
      },
    ]);

    const byPlatform: any = {};
    let totals = {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: 0,
      engagement_rate: 0,
    };

    stats.forEach((stat) => {
      byPlatform[stat._id] = {
        posts: stat.posts_count,
        views: stat.total_views,
        likes: stat.total_likes,
        comments: stat.total_comments,
        shares: stat.total_shares,
        clicks: stat.total_clicks,
        avg_engagement_rate: parseFloat((stat.avg_engagement_rate || 0).toFixed(2)),
      };

      totals.views += stat.total_views;
      totals.likes += stat.total_likes;
      totals.comments += stat.total_comments;
      totals.shares += stat.total_shares;
      totals.clicks += stat.total_clicks;
    });

    // Calculate average engagement
    if (stats.length > 0) {
      const totalEngagement = stats.reduce((sum, s) => sum + (s.avg_engagement_rate || 0), 0);
      totals.engagement_rate = parseFloat((totalEngagement / stats.length).toFixed(2));
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          total_posts: postIds.length,
          total_platforms: stats.length,
          by_platform: byPlatform,
          totals,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'private, max-age=300' } }
    );
  } catch (error: any) {
    console.error('GET /api/social/analytics/summary error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
