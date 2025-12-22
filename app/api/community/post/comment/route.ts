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
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    if (!isObjectIdLike(postId)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (text.length > 1000) {
      return NextResponse.json({ error: 'text is too long' }, { status: 400 });
    }

    const post = await CommunityPost.findById(postId).select({ communityId: 1 }).lean();
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const communityId = String((post as any).communityId || '');
    const userId = await requireCommunityMembership(request, communityId);

    await CommunityPost.updateOne(
      { _id: postId },
      {
        $push: {
          comments: {
            userId,
            text,
            createdAt: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const status = typeof (error as any)?.status === 'number' ? (error as any).status : 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Failed to add comment';
    if (status >= 500) console.error('Community comment error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
