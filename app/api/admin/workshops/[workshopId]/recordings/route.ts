/**
 * API to get Zoom recordings for a specific workshop
 * GET /api/admin/workshops/[workshopId]/recordings
 * Returns only gallery_view recordings
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getZoomRecordingSync } from '@/lib/schemas/enterpriseSchemas';
import { getWorkshop } from '@/lib/schemas/workshopSchemas';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { workshopId: string } }
) {
  try {
    // Verify admin
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const Workshop = getWorkshop();
    const ZoomRecordingSync = getZoomRecordingSync();

    const { workshopId } = params;

    // Find workshop
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    // Find recordings by workshopId OR by matching zoomMeetingId
    const query: any = {
      $or: [
        { workshopId: workshop._id },
      ],
    };

    // Also match by Zoom meeting ID if present
    if (workshop.zoomMeetingId) {
      query.$or.push({ zoomMeetingId: workshop.zoomMeetingId });
    }

    const recordings = await ZoomRecordingSync.find(query)
      .sort({ syncedAt: -1 })
      .lean();

    // Filter to only return gallery_view recordings
    const galleryRecordings = recordings.map((rec: any) => {
      const galleryFile = rec.syncedFiles?.find((f: any) => 
        f.recordingType === 'gallery_view' || 
        f.recordingType === 'shared_screen_with_gallery_view'
      );

      return {
        _id: rec._id,
        topic: rec.topic,
        startTime: rec.startTime,
        duration: rec.duration,
        syncedAt: rec.syncedAt,
        galleryView: galleryFile ? {
          s3Url: galleryFile.s3Url,
          s3Key: galleryFile.s3Key,
          fileSize: galleryFile.fileSize,
          displayName: galleryFile.displayName,
        } : null,
      };
    }).filter((rec: any) => rec.galleryView !== null);

    return NextResponse.json({
      success: true,
      workshop: {
        _id: workshop._id,
        name: workshop.name,
        zoomMeetingId: workshop.zoomMeetingId,
        zoomJoinUrl: workshop.zoomJoinUrl,
      },
      recordings: galleryRecordings,
    });
  } catch (error: any) {
    console.error('[Workshop Recordings API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}
