import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityPost } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin token
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ error: 'Invalid postId' }, { status: 400 });
    }

    // Delete the post
    const result = await CommunityPost.findByIdAndDelete(postId);

    if (!result) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
      data: { deletedId: postId },
    });
  } catch (error: any) {
    console.error('[Admin Community Posts Delete] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete post' }, { status: 500 });
  }
}
