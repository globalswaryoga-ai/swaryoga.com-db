import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { requireCommunityMembership } from '@/lib/communityAuth';
import { getCommunityPost } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultCommunities();

    const { searchParams } = new URL(request.url);
    const postId = (searchParams.get('postId') || '').trim();

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const post = await getCommunityPost(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const communityId = String(post.communityId || '');
    const userId = await requireCommunityMembership(request, communityId);

    const likes = Array.isArray(post.likes) ? post.likes : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          id: post.id,
          _id: post.id,
          communityId,
          userId: post.userId,
          content: post.content,
          images: Array.isArray(post.images) ? post.images : [],
          likesCount: likes.length,
          likedByMe: likes.includes(userId),
          comments: Array.isArray(post.comments)
            ? post.comments.map((c: any) => ({
                userId: c.userId,
                text: c.text,
                createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
              }))
            : [],
          createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : '',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const status = typeof (error as any)?.status === 'number' ? (error as any).status : 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Failed to load post';
    if (status >= 500) console.error('Community post get error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
