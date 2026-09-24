import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { verifyCommunityTenant } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {

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
    let clauses = ["(community_id = ? OR json_extract(data_json, '$.metadata.targetCommunityIds') LIKE ?)"];
    let args: any[] = [communityId, `%${communityId}%`];

    if (search) {
      clauses.push("(json_extract(data_json, '$.content') LIKE ? OR user_id LIKE ?)");
      args.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    let total = 0;
    let postsWithMetadata: any[] = [];
    let pageParam = page;
    let limitParam = limit;
    
    try {
      const countRes = await bunnyExecute({
        sql: `SELECT COUNT(*) AS count FROM community_posts_sql WHERE ${clauses.join(' AND ')}`,
        args
      });
      total = Number(countRes.rows[0]?.count || 0);

      // Fetch posts with pagination
      const skip = (page - 1) * limit;
      const sortCol = sortBy === 'createdAt' ? 'created_at' : (sortBy === 'updatedAt' ? 'updated_at' : 'created_at');
      const sortOrderSql = searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

      const postsRes = await bunnyExecute({
        sql: `SELECT document_id, data_json FROM community_posts_sql WHERE ${clauses.join(' AND ')} ORDER BY ${sortCol} ${sortOrderSql} LIMIT ? OFFSET ?`,
        args: [...args, limit, skip]
      });

      postsWithMetadata = postsRes.rows.map((row: any) => {
        const post = JSON.parse(String(row.data_json));
        return {
          _id: post._id || row.document_id,
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
        };
      });
    } catch (dbErr) {
      console.error('[Admin Community Posts List] DB error (likely missing table), returning empty', dbErr);
    }

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
