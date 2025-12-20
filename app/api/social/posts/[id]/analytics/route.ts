import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { PostAnalytics, Post } from '@/lib/schemas/socialMediaSchemas';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * GET /api/social/posts/[id]/analytics
 * Get real-time analytics for a specific post across all platforms
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    // Verify ownership
    const post = await Post.findById(params.id).lean() as any;
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user_id.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Not your post' }, { status: 403 });
    }

    // Get analytics for all platforms
    const analytics = await PostAnalytics.find({
      post_id: mongoose.Types.ObjectId.createFromHexString(params.id),
    })
      .select('-__v')
      .lean();

    // Calculate totals
    const totals = {
      total_views: 0,
      total_likes: 0,
      total_comments: 0,
      total_shares: 0,
      total_clicks: 0,
      avg_engagement_rate: 0,
    };

    analytics.forEach((a) => {
      totals.total_views += a.views || 0;
      totals.total_likes += a.likes || 0;
      totals.total_comments += a.comments || 0;
      totals.total_shares += a.shares || 0;
      totals.total_clicks += a.clicks || 0;
    });

    if (analytics.length > 0) {
      const totalEngagement = analytics.reduce((sum, a) => sum + (a.engagement_rate || 0), 0);
      totals.avg_engagement_rate = parseFloat((totalEngagement / analytics.length).toFixed(2));
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          post: { id: post._id, content: post.content, published_at: post.published_at },
          by_platform: analytics,
          totals,
          total_platforms: analytics.length,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  } catch (error: any) {
    console.error('GET /api/social/posts/[id]/analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
