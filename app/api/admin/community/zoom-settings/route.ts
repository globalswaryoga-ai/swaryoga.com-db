import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getZoomCommunityMapping, getCommunity } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/community/zoom-settings
 * List all Zoom → Community mappings
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const ZoomMapping = getZoomCommunityMapping();

    const mappings = await ZoomMapping.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      mappings,
    });
  } catch (error: any) {
    console.error('[Zoom Settings GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/community/zoom-settings
 * Add a new Zoom → Community mapping
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { zoomMeetingId, communityId, zoomTopic } = body;

    if (!zoomMeetingId || !communityId) {
      return NextResponse.json(
        { error: 'zoomMeetingId and communityId are required' },
        { status: 400 }
      );
    }

    await connectDB();
    const ZoomMapping = getZoomCommunityMapping();
    const Community = getCommunity();

    // Verify community exists
    const community = await Community.findById(communityId).lean();
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check for duplicate
    const existing = await ZoomMapping.findOne({ zoomMeetingId });
    if (existing) {
      return NextResponse.json(
        { error: `Zoom meeting ${zoomMeetingId} already mapped` },
        { status: 409 }
      );
    }

    // Create mapping
    const mapping = await ZoomMapping.create({
      zoomMeetingId,
      communityId,
      communityName: community.name,
      zoomTopic: zoomTopic || undefined,
    });

    return NextResponse.json({
      success: true,
      mapping,
    });
  } catch (error: any) {
    console.error('[Zoom Settings POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/community/zoom-settings?id=mappingId
 * Delete a Zoom → Community mapping
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
    }

    await connectDB();
    const ZoomMapping = getZoomCommunityMapping();

    const result = await ZoomMapping.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Zoom Settings DELETE]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
