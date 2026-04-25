import { NextRequest, NextResponse } from 'next/server';
import { CommunityPost } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

const isObjectIdLike = (value: string) => /^[a-f\d]{24}$/i.test(value);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = (searchParams.get('postId') || '').trim();

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    if (!isObjectIdLike(postId)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Fetch post and verify it's published (public access)
    const post = await CommunityPost.findById(postId).lean();
    if (!post || (post as any).status !== 'published') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const likes = Array.isArray((post as any).likes) ? ((post as any).likes as string[]) : [];
    const comments = Array.isArray((post as any).comments) ? (post as any).comments : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          id: (post as any)._id?.toString(),
          communityId: String((post as any).communityId || ''),
          userId: (post as any).userId,
          content: (post as any).content,
          images: Array.isArray((post as any).images) ? (post as any).images : [],
          status: (post as any).status || 'published',
          likesCount: likes.length,
          likedByMe: false, // Public users can't like without being logged in
          comments: comments
            .map((c: any) => ({
              userId: c.userId,
              text: c.text,
              createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
            }))
            .filter((c: any) => c.text), // Filter out empty comments
          createdAt: (post as any).createdAt ? new Date((post as any).createdAt).toISOString() : '',
        },
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
    console.error('Error fetching public post:', error);
    return NextResponse.json({ error: 'Failed to load post' }, { status: 500 });
  }
}
