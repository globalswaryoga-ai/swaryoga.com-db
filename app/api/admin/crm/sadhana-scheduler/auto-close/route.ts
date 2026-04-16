import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

/**
 * Get Zoom OAuth access token
 */
async function getZoomAccessToken(): Promise<string> {
  try {
    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=account_credentials&account_id=' + ZOOM_ACCOUNT_ID,
    });

    if (!response.ok) throw new Error('Failed to get Zoom token');
    const data = await response.json() as { access_token: string };
    return data.access_token;
  } catch (err) {
    console.error('Zoom token error:', err);
    throw err;
  }
}

/**
 * Send final message and end Zoom meeting
 */
async function endZoomMeetingGracefully(meetingId: string): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    console.log(`[Zoom Auto-Close] Ending meeting ${meetingId}`);

    // Send final message to chat
    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '🙏 Video completed - Thank you for joining Swar Sadhana! Meeting will close in 10 seconds...',
      }),
    }).catch(() => {}); // Ignore errors

    // Stop live stream
    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/livestream`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stop',
      }),
    }).catch(() => {}); // Ignore errors

    // Delete/End the meeting
    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok || response.status === 204 || response.status === 404) {
      console.log(`[Zoom Auto-Close] Meeting ${meetingId} closed successfully`);
    } else {
      console.warn(`[Zoom Auto-Close] Status: ${response.status}`);
    }
  } catch (err) {
    console.error('[Zoom Auto-Close] Error:', err);
  }
}

/**
 * POST /api/admin/crm/sadhana-scheduler/auto-close
 * Close Zoom meeting after video completes
 * Called from webhook or manual trigger
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;
    const { meetingId, zoomLink } = body;

    if (!meetingId && !zoomLink) {
      return NextResponse.json(
        { error: 'meetingId or zoomLink required' },
        { status: 400 }
      );
    }

    // Extract meeting ID from Zoom link if provided
    let finalMeetingId = meetingId;
    if (zoomLink && !meetingId) {
      const match = zoomLink.match(/j\/(\d+)/);
      if (match) {
        finalMeetingId = match[1];
      }
    }

    await endZoomMeetingGracefully(finalMeetingId);

    return NextResponse.json(
      {
        success: true,
        meetingId: finalMeetingId,
        message: 'Meeting closed',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Zoom Auto-Close] Error:', error);
    return NextResponse.json(
      { error: 'Failed to close meeting' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/crm/sadhana-scheduler/auto-close?meetingId=...
 * Close meeting via GET (for Zoom webhooks)
 */
export async function GET(request: NextRequest) {
  try {
    const meetingId = request.nextUrl.searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json(
        { error: 'meetingId required' },
        { status: 400 }
      );
    }

    await endZoomMeetingGracefully(meetingId);

    return NextResponse.json(
      {
        success: true,
        meetingId,
        message: 'Meeting closed',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Zoom Auto-Close] Error:', error);
    return NextResponse.json(
      { error: 'Failed to close meeting' },
      { status: 500 }
    );
  }
}
