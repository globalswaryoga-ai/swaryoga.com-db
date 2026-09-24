/**
 * HLS Stream API - Zoom RTMP Streaming Control
 * Streams Bunny HLS directly to Zoom meetings
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, isSuperAdmin } from '@/lib/crm-handlers';
import {
  startHLSStream,
  stopHLSStream,
  getStreamStatus,
  listActiveStreams,
} from '@/lib/zoomHLSStreamService';

export const dynamic = 'force-dynamic';

interface HLSStreamRequest {
  action: 'start' | 'stop' | 'status' | 'list';
  meetingId?: string;
  hlsUrl?: string; // Bunny HLS URL
  duration?: number; // in minutes
}

/**
 * POST /api/admin/crm/sadhana-scheduler/hls-stream
 * Control HLS streaming to Zoom
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin only' },
        { status: 403 }
      );
    }

    const body: HLSStreamRequest = await request.json();
    const { action, meetingId, hlsUrl, duration } = body;

    console.log(`[HLSStream API] 📡 Action: ${action}`, { meetingId, hlsUrl });

    // START STREAM
    if (action === 'start') {
      if (!meetingId || !hlsUrl || !duration) {
        return NextResponse.json(
          { error: 'meetingId, hlsUrl, and duration required' },
          { status: 400 }
        );
      }

      console.log(`[HLSStream API] 🎬 Starting stream to meeting ${meetingId}`);
      console.log(`[HLSStream API] 📹 HLS URL: ${hlsUrl}`);
      console.log(`[HLSStream API] ⏱️ Duration: ${duration} minutes`);

      const result = await startHLSStream({
        meetingId,
        hlsUrl,
        duration,
      });

      if (result.status !== 'streaming') {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'HLS stream started',
          stream: result,
        },
        { status: 200 }
      );
    }

    // STOP STREAM
    if (action === 'stop') {
      if (!meetingId) {
        return NextResponse.json(
          { error: 'meetingId required' },
          { status: 400 }
        );
      }

      console.log(`[HLSStream API] 🛑 Stopping stream for meeting ${meetingId}`);

      const result = await stopHLSStream(meetingId);

      return NextResponse.json(
        {
          success: true,
          message: 'HLS stream stopped',
          stream: result,
        },
        { status: 200 }
      );
    }

    // GET STATUS
    if (action === 'status') {
      if (!meetingId) {
        return NextResponse.json(
          { error: 'meetingId required' },
          { status: 400 }
        );
      }

      const status = getStreamStatus(meetingId);

      return NextResponse.json(
        {
          success: true,
          status,
        },
        { status: 200 }
      );
    }

    // LIST ALL STREAMS
    if (action === 'list') {
      const streams = listActiveStreams();

      return NextResponse.json(
        {
          success: true,
          activeStreams: streams,
          count: Object.keys(streams).length,
        },
        { status: 200 }
      );
    }

    // GET INSTRUCTIONS
    if (action === 'instructions') {
      if (!meetingId || !hlsUrl) {
        return NextResponse.json(
          { error: 'meetingId and hlsUrl required' },
          { status: 400 }
        );
      }

      const status = getStreamStatus(meetingId);
      if (status.status !== 'streaming') {
        return NextResponse.json(
          { error: 'Stream not active' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          status,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    return handleCrmError(error, 'POST hls-stream');
  }
}

/**
 * GET /api/admin/crm/sadhana-scheduler/hls-stream
 * Get stream status or list all streams
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const meetingId = request.nextUrl.searchParams.get('meetingId');

    if (meetingId) {
      // Get specific stream status
      const status = getStreamStatus(meetingId);
      return NextResponse.json(
        { success: true, status },
        { status: 200 }
      );
    } else {
      // List all active streams
      const streams = listActiveStreams();
      return NextResponse.json(
        {
          success: true,
          activeStreams: streams,
          count: Object.keys(streams).length,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return handleCrmError(error, 'GET hls-stream');
  }
}
