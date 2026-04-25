import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/recordings/update-thumbnail
 * Update thumbnail for a recording by title
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, thumbnailUrl } = body;

    if (!title || !thumbnailUrl) {
      return NextResponse.json(
        { error: 'title and thumbnailUrl are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const { getCommunityVideo } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    const updated = await CommunityVideo.findOneAndUpdate(
      { title: { $regex: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
      { thumbnailUrl },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: `Recording "${title}" not found` },
        { status: 404 }
      );
    }

    console.log(`✅ Updated thumbnail for: ${updated.title}`);

    return NextResponse.json({
      success: true,
      message: `Updated thumbnail for ${updated.title}`,
      recording: {
        _id: updated._id.toString(),
        title: updated.title,
        thumbnailUrl: updated.thumbnailUrl,
      },
    });
  } catch (error: any) {
    console.error('Thumbnail update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update thumbnail' },
      { status: 500 }
    );
  }
}
