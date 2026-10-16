/**
 * API to manage Zoom meeting for a specific workshop (BunnyDB)
 * PATCH - Update Zoom meeting
 * DELETE - Delete Zoom meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  getWorkshopCatalogItemByIdOrSlug,
} from '@/lib/bunnyWorkshopScheduleRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { updateZoomMeeting, deleteZoomMeeting, createZoomMeeting } from '@/lib/zoom-meetings';
import { notifyZoomLink } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/**
 * PATCH - Update Zoom meeting for workshop
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { workshopId: string } }
) {
  try {
    const token =
      request.cookies.get('token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { workshopId } = params;

    const workshop = await getWorkshopCatalogItemByIdOrSlug(workshopId);
    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    const body = await request.json();
    const { topic, startTime, duration } = body;
    const metadata = (workshop as any).metadata || {};

    // If workshop has existing Zoom meeting, update it
    if (metadata.zoomMeetingId) {
      try {
        await updateZoomMeeting(metadata.zoomMeetingId, {
          topic: topic || workshop.name,
          startTime: startTime ? new Date(startTime) : undefined,
          duration,
        });

        return NextResponse.json({
          success: true,
          message: 'Zoom meeting updated',
        });
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Create new Zoom meeting if doesn't exist
      if (!startTime) {
        return NextResponse.json({ error: 'Start time required for new meeting' }, { status: 400 });
      }

      const meeting = await createZoomMeeting({
        topic: topic || workshop.name,
        startTime: new Date(startTime),
        duration: duration || 90,
        autoRecording: 'cloud',
      });

      const updatedMeta = {
        ...metadata,
        zoomMeetingId: meeting.id,
        zoomJoinUrl: meeting.join_url,
        zoomStartUrl: meeting.start_url,
        zoomPassword: meeting.password,
      };

      await bunnyExecute({
        sql: 'UPDATE workshop_catalog_sql SET updated_at = ? WHERE slug = ?',
        args: [new Date().toISOString(), workshop.slug],
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'Zoom meeting created',
        meeting: {
          id: meeting.id,
          joinUrl: meeting.join_url,
          password: meeting.password,
        },
      });
    }
  } catch (error: any) {
    console.error('[Update Zoom Meeting] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE - Remove Zoom meeting from workshop
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { workshopId: string } }
) {
  try {
    const token =
      request.cookies.get('token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { workshopId } = params;

    const workshop = await getWorkshopCatalogItemByIdOrSlug(workshopId);
    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    const metadata = (workshop as any).metadata || {};

    if (metadata.zoomMeetingId) {
      try {
        await deleteZoomMeeting(metadata.zoomMeetingId);
      } catch (error: any) {
        console.error('[Delete Zoom] Zoom API error:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Zoom meeting deleted',
    });
  } catch (error: any) {
    console.error('[Delete Zoom Meeting] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
