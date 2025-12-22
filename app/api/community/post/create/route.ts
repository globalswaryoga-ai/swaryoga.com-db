import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { requireCommunityMembership } from '@/lib/communityAuth';
import { CommunityPost } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultCommunities();

    const body = await request.json().catch(() => null);
    const communityId = typeof body?.communityId === 'string' ? body.communityId.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const imagesRaw = Array.isArray(body?.images) ? body.images : [];

    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    if (content.length > 4000) {
      return NextResponse.json({ error: 'content is too long' }, { status: 400 });
    }

    const images = imagesRaw
      .filter((v: unknown) => typeof v === 'string')
      .map((v: string) => v.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (images.some((k: string) => k.length > 512)) {
      return NextResponse.json({ error: 'invalid image key' }, { status: 400 });
    }

    const userId = await requireCommunityMembership(request, communityId);

    const created = await CommunityPost.create({
      communityId,
      userId,
      content,
      images,
      likes: [],
      comments: [],
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: created._id?.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const status = typeof (error as any)?.status === 'number' ? (error as any).status : 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Failed to create post';
    if (status >= 500) console.error('Community create post error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
