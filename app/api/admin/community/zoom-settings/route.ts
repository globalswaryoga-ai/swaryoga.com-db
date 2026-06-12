import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB, getCommunity } from '@/lib/db';
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

    // Store mappings in socialmediaaccounts.metadata.zoomMappings to avoid
    // hitting MongoDB Atlas 500-collection limit. Read all mappings from there.
    const Accounts = mongoose.connection.db.collection('socialmediaaccounts');
    const ytAccount = await Accounts.findOne(
      { platform: 'youtube' },
      { projection: { 'metadata.zoomMappings': 1 } }
    );
    const mappings = ytAccount?.metadata?.zoomMappings || [];

    return NextResponse.json({
      success: true,
      mappings: mappings.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
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
    const { zoomMeetingId, communityId, zoomTopic, thumbnailUrl } = body;

    if (!zoomMeetingId || !communityId) {
      return NextResponse.json(
        { error: 'zoomMeetingId and communityId are required' },
        { status: 400 }
      );
    }

    await connectDB();
    const Community = getCommunity();
    const Accounts = mongoose.connection.db.collection('socialmediaaccounts');

    // Verify community exists. communityId may be a slug ('global', 'swar-aahar-shastra')
    // or a Mongo ObjectId — resolve by either.
    let community: any = await Community.findOne({ id: communityId }).lean();
    if (!community && /^[0-9a-fA-F]{24}$/.test(communityId)) {
      community = await Community.findById(communityId).lean();
    }
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Store in socialmediaaccounts.metadata.zoomMappings (avoids 500-collection limit).
    const ytAccount = await Accounts.findOne({ platform: 'youtube' });
    if (!ytAccount) {
      return NextResponse.json(
        { error: 'YouTube account not configured' },
        { status: 400 }
      );
    }

    const mappings = ytAccount.metadata?.zoomMappings || [];
    if (mappings.some((m: any) => m.zoomMeetingId === zoomMeetingId)) {
      return NextResponse.json(
        { error: `Zoom meeting ${zoomMeetingId} already mapped` },
        { status: 409 }
      );
    }

    // Create mapping document
    const mapping = {
      _id: new mongoose.Types.ObjectId(),
      zoomMeetingId,
      communityId,
      communityName: community.name,
      zoomTopic: zoomTopic || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      createdAt: new Date(),
    };

    // Add to mappings array
    await Accounts.updateOne(
      { platform: 'youtube' },
      {
        $push: { 'metadata.zoomMappings': mapping },
      }
    );

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
    const Accounts = mongoose.connection.db.collection('socialmediaaccounts');

    // Delete from socialmediaaccounts.metadata.zoomMappings array
    const result = await Accounts.updateOne(
      { platform: 'youtube' },
      { $pull: { 'metadata.zoomMappings': { _id: new mongoose.Types.ObjectId(id) } } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Zoom Settings DELETE]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
