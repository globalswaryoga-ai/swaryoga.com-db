import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {

    // Verify admin token
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    

    const body = await request.json();
    const { postId, content, images, videos, documents, links, status, metadata } = body;

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required and must be a string' }, { status: 400 });
    }

    // Check if post exists
    const postRes = await bunnyExecute({
      sql: 'SELECT data_json FROM community_posts_sql WHERE document_id = ?',
      args: [postId]
    });
    
    if (postRes.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const existingPost = JSON.parse(String(postRes.rows[0].data_json));

    // Update optional fields if provided
    existingPost.content = content.trim();
    existingPost.updatedAt = new Date().toISOString();

    if (Array.isArray(images)) {
      existingPost.images = images;
    }
    if (Array.isArray(videos)) {
      existingPost.videos = videos;
    }
    if (Array.isArray(documents)) {
      existingPost.documents = documents;
    }
    if (Array.isArray(links)) {
      existingPost.links = links;
    }
    if (status) {
      existingPost.status = status;
    }
    if (metadata) {
      existingPost.metadata = {
        ...existingPost.metadata,
        ...metadata
      };
    }

    // Update the post
    await bunnyExecute({
      sql: 'UPDATE community_posts_sql SET data_json = ?, updated_at = ? WHERE document_id = ?',
      args: [JSON.stringify(existingPost), existingPost.updatedAt, postId]
    });

    return NextResponse.json({
      success: true,
      message: 'Post updated successfully',
      data: {
        _id: postId,
        content: existingPost.content,
        images: existingPost.images,
        videos: existingPost.videos,
        documents: existingPost.documents,
        links: existingPost.links,
        status: existingPost.status,
        updatedAt: existingPost.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[Admin Community Posts Edit] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update post' }, { status: 500 });
  }
}
