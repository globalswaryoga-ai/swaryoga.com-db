import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityPost } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';


/**
 * POST /api/admin/crm/community/posts/toggle-public
 * Toggle the isPublic flag on a post (admin only)
 * Body: { postId: string }
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    

    const { postId } = await request.json();

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ error: 'Valid postId is required' }, { status: 400 });
    }

    const post = await CommunityPost.findOne({ _id: postId });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Toggle isPublic
    const newValue = !post.isPublic;
    post.isPublic = newValue;
    post.updatedAt = new Date();
    await post.save();

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
