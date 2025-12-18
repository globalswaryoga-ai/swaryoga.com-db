import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { requireCommunityMembership } from '@/lib/communityAuth';
import { CommunityPost } from '@/models/CommunityPost';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultCommunities();

    const { searchParams } = new URL(request.url);
    const communityId = (searchParams.get('communityId') || '').trim();
    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required' }, { status: 400 });
    }

    const userId = await requireCommunityMembership(request, communityId);

    const posts = await CommunityPost.find({ communityId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: posts.map((p: any) => ({
          id: p._id?.toString(),
          communityId: p.communityId,
          userId: p.userId,
          content: p.content,
          images: Array.isArray(p.images) ? p.images : [],
          likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
          likedByMe: Array.isArray(p.likes) ? p.likes.includes(userId) : false,
          comments: Array.isArray(p.comments)
            ? p.comments.map((c: any) => ({
                userId: c.userId,
                text: c.text,
                createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
              }))
            : [],
          createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : '',
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    const status = typeof (error as any)?.status === 'number' ? (error as any).status : 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Failed to load feed';
    if (status >= 500) console.error('Community feed error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
