import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { requireCommunityMembership } from '@/lib/communityAuth';
import { getCommunityPost, addCommunityComment } from '@/lib/bunnyCommunityRepository';
import { contentHasLink, enforceCommunityChatPolicy, getMyCommunityChatPolicy } from '@/lib/communityChatPolicy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultCommunities();

    const body = await request.json().catch(() => null);
    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (text.length > 1000) {
      return NextResponse.json({ error: 'text is too long' }, { status: 400 });
    }

    const post = await getCommunityPost(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const communityId = String(post.communityId || '');
    const userId = await requireCommunityMembership(request, communityId);

    // Enforce per-member chat policy.
    const policy = await getMyCommunityChatPolicy({ request, communityId });
    enforceCommunityChatPolicy({ policy, messageType: 'text', hasLink: contentHasLink(text) });

    await addCommunityComment(postId, {
      userId,
      text,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const status = typeof (error as any)?.status === 'number' ? (error as any).status : 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Failed to add comment';
    if (status >= 500) console.error('Community comment error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
