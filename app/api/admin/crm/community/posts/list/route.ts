import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityPost } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { verifyCommunityTenant } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin token
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const search = searchParams.get('search') || '';

    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required' }, { status: 400 });
    }

    // Community-level tenant isolation
    if (!(await verifyCommunityTenant(decoded, communityId))) {
      return NextResponse.json({ error: 'Access denied to this community' }, { status: 403 });
    }

    // Build query - check both communityId and metadata.targetCommunityIds
    const communityFilter = {
      $or: [
        { communityId },
        { 'metadata.targetCommunityIds': communityId }
      ]
    };
    
    let query: any = communityFilter;
    
    if (search) {
      query = {
        $and: [
          communityFilter,
          {
            $or: [
              { content: { $regex: search, $options: 'i' } },
              { userId: { $regex: search, $options: 'i' } },
            ]
          }
        ]
      };
    }

    // Get total count
    const total = await CommunityPost.countDocuments(query);

    // Fetch posts with pagination
    const skip = (page - 1) * limit;
    const posts = await CommunityPost.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const postsWithMetadata = posts.map((post: any) => ({
      _id: post._id?.toString(),
      communityId: post.communityId,
      userId: post.userId,
      content: post.content,
      images: post.images || [],
      videos: post.videos || [],
      documents: post.documents || [],
      links: post.links || [],
      type: post.type || 'text',
      status: post.status || 'published',
      likes: post.likes || [],
      comments: post.comments || [],
      metadata: post.metadata || {},
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      scheduledFor: post.scheduledFor,
    }));

    return NextResponse.json({
      success: true,
      data: {
        posts: postsWithMetadata,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('[Admin Community Posts List] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch posts' }, { status: 500 });
  }
}
