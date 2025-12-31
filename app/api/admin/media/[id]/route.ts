import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { MediaPost } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

/**
 * GET /api/admin/media/[id]
 * Fetch single media post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await connectDB();

    // Validate ID
    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const post = await MediaPost.findById(params.id);

    if (!post) {
      return NextResponse.json({ error: 'Media post not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: post,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error fetching media post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media post' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/media/[id]
 * Update media post
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await connectDB();

    // Validate ID
    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const body = await request.json();

    // Update post
    const post = await MediaPost.findByIdAndUpdate(
      params.id,
      {
        ...body,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!post) {
      return NextResponse.json({ error: 'Media post not found' }, { status: 404 });
    }

    console.log(`✅ Media post updated: ${params.id}`);

    return NextResponse.json(
      {
        success: true,
        data: post,
        message: 'Media post updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error updating media post:', error);
    return NextResponse.json(
      { error: 'Failed to update media post' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/media/[id]
 * Delete media post
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await connectDB();

    // Validate ID
    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const post = await MediaPost.findByIdAndDelete(params.id);

    if (!post) {
      return NextResponse.json({ error: 'Media post not found' }, { status: 404 });
    }

    console.log(`✅ Media post deleted: ${params.id}`);

    return NextResponse.json(
      {
        success: true,
        data: { deletedId: params.id },
        message: 'Media post deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error deleting media post:', error);
    return NextResponse.json(
      { error: 'Failed to delete media post' },
      { status: 500 }
    );
  }
}
