import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { MediaPost } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/admin/media
 * Fetch all media posts (paginated)
 * Query params: limit (default 50), skip (default 0), status, category, featured, search
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await connectDB();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const skip = parseInt(searchParams.get('skip') || '0');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (featured === 'true') {
      query.featured = true;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Fetch paginated results
    const posts = await MediaPost.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Count total
    const total = await MediaPost.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: {
          posts,
          total,
          limit,
          skip,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error fetching media posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media posts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/media
 * Create a new media post
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      );
    }

    // Create new media post
    const post = await MediaPost.create({
      title: body.title,
      description: body.description || '',
      blocks: body.blocks || [],
      leftSidebar: body.leftSidebar || {
        title: '',
        items: [],
      },
      rightSidebar: body.rightSidebar || {
        title: '',
        items: [],
      },
      status: body.status || 'draft',
      socialMedia: body.socialMedia || {
        postToWhatsApp: false,
        postToFacebook: false,
        postToInstagram: false,
        postToTwitter: false,
        postToCommunityGroups: false,
      },
      communityGroups: body.communityGroups || {
        selectedGroups: [],
        broadcastStatus: 'pending',
      },
      category: body.category || 'update',
      tags: body.tags || [],
      author: decoded.isAdmin ? decoded.username || decoded.userId : 'Unknown',
      featured: body.featured || false,
      metadata: body.metadata || {},
    });

    console.log(`✅ Media post created: ${post._id}`);

    return NextResponse.json(
      {
        success: true,
        data: post,
        message: 'Media post created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error creating media post:', error);
    return NextResponse.json(
      { error: 'Failed to create media post' },
      { status: 500 }
    );
  }
}
