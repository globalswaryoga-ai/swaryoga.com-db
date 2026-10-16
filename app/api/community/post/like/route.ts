import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { requireCommunityMembership } from '@/lib/communityAuth';
import { getCommunityPost, likeCommunityPost } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultCommunities();

    const body = await request.json().catch(() => null);
    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const post = await getCommunityPost(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const communityId = String(post.communityId || '');
    const userId = await requireCommunityMembership(request, communityId);

    const result = await likeCommunityPost(postId, userId);

    return NextResponse.json(
      {
        success: true,
        data: {
          likesCount: result.likesCount,
          likedByMe: result.likedByMe,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const status = typeof (error as any)?.status === 'number' ? (error as any).status : 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Failed to like post';
    if (status >= 500) console.error('Community like error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
