import { NextRequest, NextResponse } from 'next/server';
import { listCommunityPosts } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || 'all').trim();
    const communityId = searchParams.get('communityId')?.trim();
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const publicOnly = searchParams.get('public') === 'true';

    const result = await listCommunityPosts({
      communityId,
      category,
      publicOnly,
      limit,
      skip,
    });

    const posts = result.posts.map((p) => ({
      ...p.rawDoc,
      ...p,
      _id: p.id,
      id: p.id,
    }));

    return NextResponse.json(
      {
        posts,
        total: result.total,
        limit,
        skip,
        hasMore: skip + limit < result.total,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching community posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
