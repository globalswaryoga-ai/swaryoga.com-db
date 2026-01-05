import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { requireCommunityMembership } from '@/lib/communityAuth';
import { CommunityPost } from '@/lib/db';
import { contentHasLink, enforceCommunityChatPolicy, getMyCommunityChatPolicy } from '@/lib/communityChatPolicy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultCommunities();

    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let body: any = null;
    let communityId = '';
    let content = '';
    let imagesRaw: unknown[] = [];
    let isAdminPost = false;

    if (isMultipart) {
      const form = await request.formData();
      communityId = String(form.get('communityId') || '').trim();
      content = String(form.get('content') || '').trim();
      isAdminPost = String(form.get('isAdminPost') || '') === 'true';
      // NOTE: For now we don't store uploaded binaries here. We rely on the existing
      // `images` string keys array (pre-uploaded storage keys) in the JSON flow.
      // Multipart is accepted to avoid breaking the admin UI.
      imagesRaw = [];
    } else {
      body = await request.json().catch(() => null);
      communityId = typeof body?.communityId === 'string' ? body.communityId.trim() : '';
      content = typeof body?.content === 'string' ? body.content.trim() : '';
      imagesRaw = Array.isArray(body?.images) ? body.images : [];
      isAdminPost = Boolean(body?.isAdminPost);
    }

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

  // For now, we still enforce membership for all posts.
  // Admin UI passes an admin JWT in Authorization; membership can be managed via
  // community admin endpoints.
    const userId = await requireCommunityMembership(request, communityId);

    // Enforce per-member chat policy (admin-controlled).
    const policy = await getMyCommunityChatPolicy({ request, communityId });
    enforceCommunityChatPolicy({
      policy,
      messageType: images.length > 0 ? 'image' : 'text',
      hasLink: contentHasLink(content),
    });

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
