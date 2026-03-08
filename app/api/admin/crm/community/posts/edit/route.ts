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
    const { postId, content, images, videos, documents, links, status, metadata } = body;

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required and must be a string' }, { status: 400 });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ error: 'Invalid postId' }, { status: 400 });
    }

    // Validate status if provided
    if (status && !['published', 'draft', 'scheduled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Check if post exists
    const existingPost = await CommunityPost.findOne({ _id: postId });
    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      content: content.trim(),
      updatedAt: new Date(),
    };

    // Update optional fields if provided
    if (Array.isArray(images)) {
      updateData.images = images;
    }
    if (Array.isArray(videos)) {
      updateData.videos = videos;
    }
    if (Array.isArray(documents)) {
      updateData.documents = documents;
    }
    if (Array.isArray(links)) {
      updateData.links = links;
    }
    if (status) {
      updateData.status = status;
    }
    if (metadata) {
      updateData.metadata = {
        ...existingPost.metadata,
        ...metadata
      };
    }

    // Update the post
    const updatedPost = await CommunityPost.findOneAndUpdate({ _id: postId }, updateData, { new: true }).lean() as any;

    if (!updatedPost) {
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Post updated successfully',
      data: {
        _id: updatedPost._id?.toString(),
        content: updatedPost.content,
        images: updatedPost.images,
        videos: updatedPost.videos,
        documents: updatedPost.documents,
        links: updatedPost.links,
        status: updatedPost.status,
        updatedAt: updatedPost.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[Admin Community Posts Edit] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update post' }, { status: 500 });
  }
}
