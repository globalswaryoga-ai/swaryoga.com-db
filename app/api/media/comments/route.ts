import { NextRequest, NextResponse } from 'next/server';
import {
  listBunnyMediaComments,
  addBunnyMediaComment,
  deleteBunnyMediaComment,
  updateBunnyMediaCommentStatus
} from '@/lib/bunnyMediaCommentsRepository';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/media/comments
 * Query parameters: mediaId, status, search, limit, skip
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mediaId = searchParams.get('mediaId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const { comments, total } = await listBunnyMediaComments({
      mediaId,
      status,
      search,
      limit,
      skip,
    });

    return NextResponse.json({
      success: true,
      data: {
        comments,
        total,
        limit,
        skip,
      },
    });
  } catch (error: any) {
    console.error('❌ Error in GET /api/media/comments:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch comments' }, { status: 500 });
  }
}

/**
 * POST /api/media/comments
 * Public/User comment creation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { mediaId, mediaTitle, authorName, authorAvatar, commentText } = body;

    if (!mediaId || !commentText?.trim()) {
      return NextResponse.json({ error: 'mediaId and commentText are required' }, { status: 400 });
    }

    const comment = await addBunnyMediaComment({
      mediaId,
      mediaTitle,
      authorName: authorName?.trim() || 'Sadhak',
      authorAvatar,
      commentText: commentText.trim(),
    });

    return NextResponse.json({ success: true, data: comment });
  } catch (error: any) {
    console.error('❌ Error in POST /api/media/comments:', error);
    return NextResponse.json({ error: error?.message || 'Failed to add comment' }, { status: 500 });
  }
}

/**
 * DELETE /api/media/comments?id=...
 * Admin comment deletion
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Comment id is required' }, { status: 400 });
    }

    await deleteBunnyMediaComment(id);
    return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error: any) {
    console.error('❌ Error in DELETE /api/media/comments:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete comment' }, { status: 500 });
  }
}

/**
 * PATCH /api/media/comments
 * Admin status update (pin, approve, flag)
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, status } = body;
    if (!id || !['approved', 'flagged', 'pinned'].includes(status)) {
      return NextResponse.json({ error: 'Valid id and status are required' }, { status: 400 });
    }

    await updateBunnyMediaCommentStatus(id, status);
    return NextResponse.json({ success: true, message: `Comment status updated to ${status}` });
  } catch (error: any) {
    console.error('❌ Error in PATCH /api/media/comments:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update comment' }, { status: 500 });
  }
}
