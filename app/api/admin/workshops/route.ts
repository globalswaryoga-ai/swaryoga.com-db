import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import { getWorkshop, getBatch, getWorkshopVideo } from '@/lib/schemas/workshopSchemas';
import { createZoomMeeting } from '@/lib/zoom-meetings';
import { createWorkshopCommunity, initializeSystemCommunities } from '@/lib/community-manager';

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

    // First create workshop to get _id
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
    });

    // 1. Initialize system communities (Global + Old Sadhak) if not exist
    try {
      await initializeSystemCommunities();
    } catch (sysComError: unknown) {
      console.error('[Workshop] Failed to init system communities:', sysComError);
    }

    // 2. Create workshop-active community (will merge into Old Sadhak on completion)
    let community = null;
    try {
      community = await createWorkshopCommunity(
        workshop._id.toString(),
        name,
        description || `Community for ${name} workshop participants`
      );
      console.log(`[Workshop] Created workshop community: ${community.name} (type: workshop_active)`);
      
      // Update workshop with community info
      workshop.communityId = community._id;
      workshop.communityName = community.name;
      await workshop.save();
    } catch (communityError: unknown) {
      console.error('[Workshop] Failed to create community:', communityError);
      // Continue without community - not critical
    }

    // 3. Create Zoom meeting if startDate provided
    if (startDate) {
      try {
        const zoomMeeting = await createZoomMeeting({
          topic: name,
          startTime: new Date(startDate),
          duration: meetingDuration || 90, // Default 90 minutes
          agenda: description || `Workshop: ${name}`,
          autoRecording: 'cloud', // Auto cloud recording for S3 sync
        });
        console.log(`[Workshop] Created Zoom meeting: ${zoomMeeting.id}`);
        
        // Update workshop with Zoom info
        workshop.zoomMeetingId = zoomMeeting.id;
        workshop.zoomJoinUrl = zoomMeeting.join_url;
        workshop.zoomStartUrl = zoomMeeting.start_url;
        workshop.zoomPassword = zoomMeeting.password;
        await workshop.save();
      } catch (zoomError: unknown) {
        console.error('[Workshop] Failed to create Zoom meeting:', zoomError);
        // Continue without Zoom - not critical
      }
    }

    // Reload workshop with all updates
    const finalWorkshop = await Workshop.findById(workshop._id).lean();

    return NextResponse.json({ 
      success: true, 
      workshop: finalWorkshop,
      zoomMeeting: finalWorkshop?.zoomMeetingId ? {
        id: finalWorkshop.zoomMeetingId,
        joinUrl: finalWorkshop.zoomJoinUrl,
        password: finalWorkshop.zoomPassword,
      } : null,
      community: community ? {
        id: community._id,
        name: community.name,
        type: community.type,
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
