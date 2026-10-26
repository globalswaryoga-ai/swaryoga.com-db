import { NextRequest, NextResponse } from 'next/server';
import { listCommunityPosts, createCommunityPost } from '@/lib/bunnyCommunityRepository';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { communityId = 'global', userId, userName, userPhoto, content, images, category = 'general', isPublic = true, rawDoc, metadata } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const post = await createCommunityPost({
      communityId: communityId.trim() || 'global',
      userId: String(userId),
      userName: userName ? String(userName) : undefined,
      userPhoto: userPhoto ? String(userPhoto) : undefined,
      content: content.trim(),
      images: Array.isArray(images) ? images : [],
      category: category ? String(category).trim().toLowerCase() : 'general',
      isPublic: Boolean(isPublic),
      rawDoc: rawDoc || (metadata ? { metadata } : {}),
    });

    return NextResponse.json({
      success: true,
      post: {
        ...post.rawDoc,
        ...post,
        _id: post.id,
        id: post.id,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating community post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}

