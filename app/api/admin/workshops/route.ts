import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB, { Community } from '@/lib/db';
import { getWorkshop, getBatch, getWorkshopVideo } from '@/lib/schemas/workshopSchemas';
import { createZoomMeeting } from '@/lib/zoom-meetings';

/**
 * GET /api/admin/workshops
 * List all workshops with their batches
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const Workshop = getWorkshop();
    const Batch = getBatch();
    const WorkshopVideo = getWorkshopVideo();

    const workshops = await Workshop.find().sort({ createdAt: -1 }).lean();

    // Get batch counts and video counts for each workshop
    const enrichedWorkshops = await Promise.all(
      workshops.map(async (workshop: any) => {
        const batchCount = await Batch.countDocuments({ workshopId: workshop._id });
        const videoCount = await WorkshopVideo.countDocuments({ workshopId: workshop._id });
        const batches = await Batch.find({ workshopId: workshop._id })
          .sort({ batchNumber: -1 })
          .limit(5)
          .lean();

        return {
          ...workshop,
          batchCount,
          videoCount,
          recentBatches: batches,
        };
      })
    );

    return NextResponse.json({ success: true, workshops: enrichedWorkshops });
  } catch (error: any) {
    console.error('[Workshops API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/workshops
 * Create a new workshop with auto Zoom meeting and community
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const Workshop = getWorkshop();

    const body = await req.json();
    const { name, description, thumbnail, level, duration, price, isFree, startDate, meetingDuration } = body;

    if (!name) {
      return NextResponse.json({ error: 'Workshop name is required' }, { status: 400 });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check for duplicate slug
    const existing = await Workshop.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: 'Workshop with this name already exists' }, { status: 400 });
    }

    // 1. Create Community for this workshop
    let community = null;
    try {
      const communityName = `${name} Community`;
      community = await Community.create({
        id: `workshop-${slug}`,
        name: communityName,
        description: `Community for ${name} workshop participants`,
        members: [],
      });
      console.log(`[Workshop] Created community: ${communityName}`);
    } catch (communityError: any) {
      console.error('[Workshop] Failed to create community:', communityError.message);
      // Continue without community - not critical
    }

    // 2. Create Zoom meeting if startDate provided
    let zoomMeeting = null;
    if (startDate) {
      try {
        zoomMeeting = await createZoomMeeting({
          topic: name,
          startTime: new Date(startDate),
          duration: meetingDuration || 90, // Default 90 minutes
          agenda: description || `Workshop: ${name}`,
          autoRecording: 'cloud', // Auto cloud recording for S3 sync
        });
        console.log(`[Workshop] Created Zoom meeting: ${zoomMeeting.id}`);
      } catch (zoomError: any) {
        console.error('[Workshop] Failed to create Zoom meeting:', zoomError.message);
        // Continue without Zoom - not critical
      }
    }

    // 3. Create workshop with Zoom and community info
    const workshop = await Workshop.create({
      name,
      slug,
      description,
      thumbnail,
      level: level || 'all',
      duration,
      price: price || 0,
      isFree: isFree || false,
      isActive: true,
      // Zoom info
      zoomMeetingId: zoomMeeting?.id,
      zoomJoinUrl: zoomMeeting?.join_url,
      zoomStartUrl: zoomMeeting?.start_url,
      zoomPassword: zoomMeeting?.password,
      // Community info
      communityId: community?._id,
      communityName: community?.name,
    });

    return NextResponse.json({ 
      success: true, 
      workshop,
      zoomMeeting: zoomMeeting ? {
        id: zoomMeeting.id,
        joinUrl: zoomMeeting.join_url,
        password: zoomMeeting.password,
      } : null,
      community: community ? {
        id: community._id,
        name: community.name,
      } : null,
    });
  } catch (error: any) {
    console.error('[Create Workshop Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/workshops
 * Update a workshop
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const Workshop = getWorkshop();

    const body = await req.json();
    const { workshopId, ...updateData } = body;

    if (!workshopId) {
      return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 });
    }

    const workshop = await Workshop.findByIdAndUpdate(
      workshopId,
      { $set: updateData },
      { new: true }
    );

    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, workshop });
  } catch (error: any) {
    console.error('[Update Workshop Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/workshops
 * Delete a workshop (soft delete by setting isActive = false)
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const Workshop = getWorkshop();

    const { searchParams } = new URL(req.url);
    const workshopId = searchParams.get('workshopId');

    if (!workshopId) {
      return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 });
    }

    await Workshop.findByIdAndUpdate(workshopId, { isActive: false });

    return NextResponse.json({ success: true, message: 'Workshop deactivated' });
  } catch (error: any) {
    console.error('[Delete Workshop Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
