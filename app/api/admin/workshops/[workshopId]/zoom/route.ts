/**
 * API to manage Zoom meeting for a specific workshop
 * PATCH - Update Zoom meeting
 * DELETE - Delete Zoom meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWorkshop } from '@/lib/schemas/workshopSchemas';
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
    const { workshopId } = params;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    const body = await request.json();
    const { topic, startTime, duration } = body;

    // If workshop has existing Zoom meeting, update it
    if (workshop.zoomMeetingId) {
      try {
        await updateZoomMeeting(workshop.zoomMeetingId, {
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

      await Workshop.findByIdAndUpdate(workshopId, {
        zoomMeetingId: meeting.id,
        zoomJoinUrl: meeting.join_url,
        zoomStartUrl: meeting.start_url,
        zoomPassword: meeting.password,
      });

      // Send Zoom link email to all enrolled users for this workshop
      try {
        const mongoose = await import('mongoose');
        let WR: any;
        try { WR = mongoose.default.model('WorkshopRegistration'); } catch { WR = null; }
        if (WR) {
          const enrolledUsers = await WR.find({
            workshopId: workshopId,
            status: { $in: ['confirmed', 'pending'] },
          }).lean();
          for (const user of enrolledUsers) {
            if (user.email) {
              notifyZoomLink(
                { name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student', email: user.email, phone: user.phone },
                {
                  workshopName: workshop.name || user.workshopName,
                  zoomJoinUrl: meeting.join_url,
                  zoomPassword: meeting.password,
                  startDate: user.startDate,
                },
              ).catch(err => console.error('[ZoomLink] Notification error:', err));
            }
          }
          console.log(`[Zoom] Sent zoom link to ${enrolledUsers.length} enrolled user(s)`);
        }
      } catch (notifErr) {
        console.error('[Zoom] Failed to send zoom link emails:', notifErr);
      }

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
    const { workshopId } = params;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    if (!workshop.zoomMeetingId) {
      return NextResponse.json({ error: 'No Zoom meeting linked' }, { status: 400 });
    }

    // Delete from Zoom
    try {
      await deleteZoomMeeting(workshop.zoomMeetingId);
    } catch (error: any) {
      console.error('[Delete Zoom] Zoom API error:', error.message);
      // Continue to remove from DB even if Zoom deletion fails
    }

    // Remove Zoom info from workshop
    await Workshop.findByIdAndUpdate(workshopId, {
      $unset: {
        zoomMeetingId: 1,
        zoomJoinUrl: 1,
        zoomStartUrl: 1,
        zoomPassword: 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Zoom meeting deleted',
    });
  } catch (error: any) {
    console.error('[Delete Zoom Meeting] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
