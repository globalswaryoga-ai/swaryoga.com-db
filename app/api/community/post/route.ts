import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { requireCommunityMembership } from '@/lib/communityAuth';
import { CommunityPost } from '@/models/CommunityPost';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isObjectIdLike = (value: string) => /^[a-f\d]{24}$/i.test(value);

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultCommunities();

    const { searchParams } = new URL(request.url);
    const postId = (searchParams.get('postId') || '').trim();

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    if (!isObjectIdLike(postId)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = await CommunityPost.findById(postId).lean();
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const communityId = String((post as any).communityId || '');
    const userId = await requireCommunityMembership(request, communityId);

    const likes = Array.isArray((post as any).likes) ? ((post as any).likes as string[]) : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          id: (post as any)._id?.toString(),
          communityId,
          userId: (post as any).userId,
          content: (post as any).content,
          images: Array.isArray((post as any).images) ? (post as any).images : [],
          likesCount: likes.length,
          likedByMe: likes.includes(userId),
          comments: Array.isArray((post as any).comments)
            ? (post as any).comments.map((c: any) => ({
                userId: c.userId,
                text: c.text,
                createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
              }))
            : [],
          createdAt: (post as any).createdAt ? new Date((post as any).createdAt).toISOString() : '',
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
