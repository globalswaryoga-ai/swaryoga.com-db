import { NextRequest, NextResponse } from 'next/server';
import { getCommunityPost } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = (searchParams.get('postId') || '').trim();

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    // Fetch post and verify it's published (public access)
    const post = await getCommunityPost(postId);
    if (!post || post.status !== 'published') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const likes = Array.isArray(post.likes) ? post.likes : [];
    const comments = Array.isArray(post.comments) ? post.comments : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          id: post.id,
          _id: post.id,
          communityId: String(post.communityId || ''),
          userId: post.userId,
          content: post.content,
          images: Array.isArray(post.images) ? post.images : [],
          status: post.status || 'published',
          likesCount: likes.length,
          likedByMe: false, // Public users can't like without being logged in
          comments: comments
            .map((c: any) => ({
                userId: c.userId,
                text: c.text,
                createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
              }))
            .filter((c: any) => c.text),
          createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : '',
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
