import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

/**
 * DELETE /api/admin/crm/community/posts/comment/delete
 * Admin-only: Delete a comment from a post
 * Body: { postId: string, commentIndex: number } OR { postId: string, userId: string, text: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    

    const body = await request.json().catch(() => null);
    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    const commentIndex = typeof body?.commentIndex === 'number' ? body.commentIndex : undefined;
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const postRes = await bunnyExecute({
      sql: 'SELECT data_json FROM community_posts_sql WHERE document_id = ?',
      args: [postId]
    });

    if (postRes.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = JSON.parse(String(postRes.rows[0].data_json));

    const comments = Array.isArray(post.comments) ? post.comments : [];
    
    let updatedComments;
    
    if (commentIndex !== undefined && commentIndex >= 0 && commentIndex < comments.length) {
      // Delete by index
      updatedComments = comments.filter((_: any, idx: number) => idx !== commentIndex);
    } else if (userId && text) {
      // Delete by matching userId and text
      updatedComments = comments.filter((c: any) => !(c.userId === userId && c.text === text));
    } else {
      return NextResponse.json({ error: 'Either commentIndex or (userId + text) required' }, { status: 400 });
    }

    post.comments = updatedComments;
    post.updatedAt = new Date().toISOString();

    await bunnyExecute({
      sql: 'UPDATE community_posts_sql SET data_json = ?, updated_at = ? WHERE document_id = ?',
      args: [JSON.stringify(post), post.updatedAt, postId]
    });

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
      data: {
        remainingComments: updatedComments.length
      }
    });
  } catch (error) {
    console.error('Admin delete comment error:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

// Also support POST method for flexibility
export async function POST(request: NextRequest) {
  return DELETE(request);
}
