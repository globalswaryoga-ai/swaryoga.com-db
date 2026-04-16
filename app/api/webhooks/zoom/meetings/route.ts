import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import axios from 'axios';
import crypto from 'crypto';
import mongoose from 'mongoose';

/**
 * Zoom Webhook Handler for Meeting Events
 * Receives: meeting.started, meeting.ended events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = JSON.parse(body);
    
    // Handle Zoom URL validation challenge FIRST (no signature check needed)
    if (event.type === 'url_validation') {
      console.log('[Zoom] URL validation challenge received');
      return NextResponse.json({ plainToken: event.token }, { status: 200 });
    }

    // For other events, verify Zoom webhook signature
    const signature = request.headers.get('x-zm-signature') || '';
    if (!verifyZoomSignature(body, signature)) {
      console.warn('Invalid Zoom webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Handle different event types
    if (event.event === 'meeting.started') {
      await handleMeetingStarted(event);
    } else if (event.event === 'meeting.ended') {
      await handleMeetingEnded(event);
    }

    // Zoom requires 200 response
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Zoom webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Verify Zoom webhook signature
 */
function verifyZoomSignature(body: string, signature: string): boolean {
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '';
  if (!secret) return true; // Skip verification if secret not set

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return hash === signature;
}

/**
 * Handle meeting.started event
 */
async function handleMeetingStarted(event: any) {
  try {
    await connectDB();
    
    const meetingId = event.payload?.object?.id;
    const meetingTopic = event.payload?.object?.topic || '';
    const hostId = event.payload?.object?.host_id;

    console.log(`[Zoom] Meeting started: ${meetingId} - ${meetingTopic}`);

    // Find schedule by meeting ID or topic
    const db = mongoose.connection.useDb('swaryoga_admin_crm');
    const schedule = await db
      .collection('sadhana_schedules')
      .findOne({
        $or: [
          { zoomId: meetingId },
          { name: { $regex: meetingTopic, $options: 'i' } },
        ],
        status: 'active',
      });

    if (!schedule) {
      console.log(`[Zoom] No schedule found for meeting: ${meetingId}`);
      return;
    }

    console.log(`[Zoom] Found schedule: ${schedule.name}`);

    // Post video link to meeting chat
    await postVideoToZoomChat(meetingId, schedule.videoUrl, schedule.name);

    // Store event in database
    await db.collection('zoom_meeting_events').insertOne({
      meetingId,
      scheduleId: schedule._id,
      event: 'started',
      videoUrl: schedule.videoUrl,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[Zoom] Error handling meeting started:', error);
  }
}

/**
 * Handle meeting.ended event
 */
async function handleMeetingEnded(event: any) {
  try {
    const meetingId = event.payload?.object?.id;
    console.log(`[Zoom] Meeting ended: ${meetingId}`);

    // Store event
    await connectDB();
    const db = mongoose.connection.useDb('swaryoga_admin_crm');
    await db.collection('zoom_meeting_events').insertOne({
      meetingId,
      event: 'ended',
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[Zoom] Error handling meeting ended:', error);
  }
}

/**
 * Post video link to Zoom meeting chat using Zoom API
 */
async function postVideoToZoomChat(
  meetingId: string,
  videoUrl: string,
  scheduleName: string
) {
  try {
    const accessToken = await getZoomAccessToken();
    if (!accessToken) {
      console.error('[Zoom] Could not get access token');
      return;
    }

    const message = `🎥 *${scheduleName}*\n\nWatch the Sadhana video:\n${videoUrl}\n\n🙏 Namaste!`;

    // Send message via Zoom API
    const response = await axios.post(
      `https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`,
      {
        message,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[Zoom] Video link posted to meeting: ${meetingId}`);
    return response.data;
  } catch (error: any) {
    console.error('[Zoom] Error posting to chat:', error.response?.data || error.message);
  }
}

/**
 * Get Zoom access token using OAuth credentials
 */
async function getZoomAccessToken(): Promise<string | null> {
  try {
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!accountId || !clientId || !clientSecret) {
      console.error('[Zoom] Missing credentials');
      return null;
    }

    const response = await axios.post(
      `https://zoom.us/oauth/token`,
      {
        grant_type: 'account_credentials',
        account_id: accountId,
      },
      {
        auth: {
          username: clientId,
          password: clientSecret,
        },
      }
    );

    return response.data.access_token;
  } catch (error: any) {
    console.error('[Zoom] Error getting access token:', error.response?.data || error.message);
    return null;
  }
}

/**
 * GET endpoint for testing
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Zoom webhook is active',
    updated: new Date().toISOString(),
  });
}
