import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { requireCommunityMembership } from '@/lib/communityAuth';
import { CommunityPost } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isObjectIdLike = (value: string) => /^[a-f\d]{24}$/i.test(value);

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultCommunities();

    const body = await request.json().catch(() => null);
    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    if (!isObjectIdLike(postId)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = await CommunityPost.findById(postId).select({ communityId: 1, likes: 1 }).lean();
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const communityId = String((post as any).communityId || '');
    const userId = await requireCommunityMembership(request, communityId);

    const likes = Array.isArray((post as any).likes) ? ((post as any).likes as string[]) : [];
    const hasLiked = likes.includes(userId);

    const updated = await CommunityPost.findByIdAndUpdate(
      postId,
      hasLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
      { new: true, select: { likes: 1 } }
    ).lean();

    const newLikes = Array.isArray((updated as any)?.likes) ? ((updated as any).likes as string[]) : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          likesCount: newLikes.length,
          likedByMe: newLikes.includes(userId),
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
