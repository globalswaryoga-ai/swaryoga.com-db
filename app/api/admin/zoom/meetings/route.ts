/**
 * API to create Zoom meetings for workshops
 * POST /api/admin/zoom/meetings - Create meeting
 * GET /api/admin/zoom/meetings - List meetings
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { createZoomMeeting, listZoomMeetings } from '@/lib/zoom-meetings';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { topic, startTime, duration, agenda, workshopId } = body;

    if (!topic || !startTime || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, startTime, duration' },
        { status: 400 }
      );
    }

    // Create Zoom meeting with cloud recording enabled
    const meeting = await createZoomMeeting({
      topic,
      startTime: new Date(startTime),
      duration,
      agenda: agenda || `Workshop: ${topic}`,
      autoRecording: 'cloud', // Auto cloud recording for S3 sync
    });

    // Optionally link to workshop in database
    if (workshopId) {
      await connectDB();
      const { getWorkshop } = await import('@/lib/schemas/workshopSchemas');
      const Workshop = getWorkshop();
      await Workshop.findByIdAndUpdate(workshopId, {
        zoomMeetingId: meeting.id,
        zoomJoinUrl: meeting.join_url,
        zoomStartUrl: meeting.start_url,
        zoomPassword: meeting.password,
      });
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        topic: meeting.topic,
        startTime: meeting.start_time,
        duration: meeting.duration,
        joinUrl: meeting.join_url,
        password: meeting.password,
      },
    });
  } catch (error: any) {
    console.error('[Create Zoom Meeting] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create meeting' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    const meetings = await listZoomMeetings();

    return NextResponse.json({
      success: true,
      meetings: meetings.map((m) => ({
        id: m.id,
        topic: m.topic,
        startTime: m.start_time,
        duration: m.duration,
        joinUrl: m.join_url,
      })),
    });
  } catch (error: any) {
    console.error('[List Zoom Meetings] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list meetings' },
      { status: 500 }
    );
  }
}
