import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Post, SocialAccount } from '@/lib/schemas/socialMediaSchemas';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/social/posts
 * Create new post ready for publishing
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { content, media, hashtags, platforms, platform_specific } =
      await request.json();

    // Validate
    if (!content?.trim() || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'content and at least one platform required' },
        { status: 400 }
      );
    }

    // Verify user has connected accounts for selected platforms
    const userAccounts = await SocialAccount.find({
      user_id: decoded.userId,
      is_connected: true,
    });
    const connectedPlatforms = userAccounts.map((a) => a.platform);
    const missingAccounts = platforms.filter((p: string) => !connectedPlatforms.includes(p));

    if (missingAccounts.length > 0) {
      return NextResponse.json(
        {
          error: `Not connected to: ${missingAccounts.join(', ')}. Connect first.`,
        },
        { status: 400 }
      );
    }

    // Create post
    const post = await Post.create({
      user_id: decoded.userId,
      content: content.trim(),
      media: media || [],
      hashtags: hashtags || [],
      platforms,
      platform_specific: platform_specific || {},
      status: 'draft',
      is_pinned: false,
      engagement_tracking: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: post,
        message: 'Post created. Ready to schedule or publish immediately.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/social/posts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/social/posts
 * List all posts for current user
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // draft, scheduled, published, failed

    let query: any = { user_id: decoded.userId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const posts = await Post.find(query)
      .select(
        'content platforms status scheduled_for published_at created_at media hashtags engagement_tracking'
      )
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Post.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: posts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  } catch (error: any) {
    console.error('GET /api/social/posts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
