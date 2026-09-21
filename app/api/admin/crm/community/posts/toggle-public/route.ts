import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


/**
 * POST /api/admin/crm/community/posts/toggle-public
 * Toggle the isPublic flag on a post (admin only)
 * Body: { postId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    

    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: 'Valid postId is required' }, { status: 400 });
    }

    const postRes = await bunnyExecute({
      sql: 'SELECT data_json FROM community_posts_sql WHERE document_id = ?',
      args: [postId]
    });

    if (postRes.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = JSON.parse(String(postRes.rows[0].data_json));

    // Toggle isPublic
    const newValue = !post.isPublic;
    post.isPublic = newValue;
    post.updatedAt = new Date().toISOString();
    
    await bunnyExecute({
      sql: 'UPDATE community_posts_sql SET data_json = ?, updated_at = ? WHERE document_id = ?',
      args: [JSON.stringify(post), post.updatedAt, postId]
    });

    return NextResponse.json({
      success: true,
      isPublic: newValue,
      message: newValue ? 'Post is now public' : 'Post is now private',
    });
  } catch (error: any) {
    console.error('[Toggle Public] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to toggle public status' }, { status: 500 });
  }
}
