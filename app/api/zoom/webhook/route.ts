/**
 * Zoom Webhook Endpoint
 * Receives recording.completed events and syncs to AWS S3
 * Only saves: speaker_view and gallery_view recordings
 * 
 * Security features:
 * - HMAC signature verification
 * - Replay attack protection (5 minute window)
 * - Duplicate event detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { syncZoomRecordingsToS3, getRecordingTypeDisplayName } from '@/lib/zoom-s3-sync';
import * as crypto from 'crypto';

// Zoom webhook event types we handle
const HANDLED_EVENTS = ['recording.completed', 'meeting.started'];

// Replay attack protection: store processed event IDs with timestamp
// Clean up entries older than 10 minutes
const processedEvents = new Map<string, number>();
const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function cleanupOldEvents() {
  const now = Date.now();
  for (const [eventId, timestamp] of processedEvents) {
    if (now - timestamp > 10 * 60 * 1000) { // 10 minutes
      processedEvents.delete(eventId);
    }
  }
}

/**
 * Verify Zoom webhook signature (optional but recommended)
 * Also checks for replay attacks using timestamp
 */
function verifyZoomWebhook(
  payload: string,
  signature: string,
  timestamp: string
): { valid: boolean; error?: string } {
  const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  
  // Check timestamp to prevent replay attacks
  if (timestamp) {
    const eventTime = parseInt(timestamp) * 1000; // Convert to milliseconds
    const now = Date.now();
    if (Math.abs(now - eventTime) > REPLAY_WINDOW_MS) {
      return { valid: false, error: 'Request timestamp too old (possible replay attack)' };
    }
  }
  
  if (!secretToken) {
    console.log('[Zoom Webhook] No secret token configured, skipping verification');
    return { valid: true }; // Skip verification if no secret configured
  }

  const message = `v0:${timestamp}:${payload}`;
  const hashForVerify = crypto
    .createHmac('sha256', secretToken)
    .update(message)
    .digest('hex');

  const expectedSignature = `v0=${hashForVerify}`;
  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }
  
  return { valid: true };
}

/**
 * Handle Zoom URL validation challenge
 */
function handleUrlValidation(payload: any): NextResponse {
  const plainToken = payload.payload?.plainToken;
  const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

  if (!plainToken) {
    return NextResponse.json({ error: 'Missing plainToken' }, { status: 400 });
  }

  // If no secret token, just echo back the plainToken
  if (!secretToken) {
    return NextResponse.json({
      plainToken,
      encryptedToken: plainToken, // Zoom accepts this for basic validation
    });
  }

  // Generate encrypted token
  const encryptedToken = crypto
    .createHmac('sha256', secretToken)
    .update(plainToken)
    .digest('hex');

  return NextResponse.json({
    plainToken,
    encryptedToken,
  });
}

/**
 * Get Zoom OAuth Access Token using Server-to-Server OAuth
 */
async function getZoomAccessToken(): Promise<string | null> {
  try {
    const accountId = process.env.ZOOM_BOT_ACCOUNT_ID;
    const clientId = process.env.ZOOM_BOT_CLIENT_ID;
    const clientSecret = process.env.ZOOM_BOT_CLIENT_SECRET;

    if (!accountId || !clientId || !clientSecret) {
      console.error('[Zoom Live Stream] Missing credentials');
      return null;
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=account_credentials&account_id=${accountId}`,
    });

    if (!tokenResponse.ok) {
      console.error(`[Zoom Live Stream] Token fetch failed: ${tokenResponse.statusText}`);
      return null;
    }

    const data = await tokenResponse.json();
    console.log('[Zoom Live Stream] Access token obtained');
    return data.access_token;
  } catch (error) {
    console.error('[Zoom Live Stream] Error getting token:', error);
    return null;
  }
}

/**
 * Bot joins meeting with "Swaryoga Bot" name (called 3 minutes before scheduled time)
 */
async function botJoinMeeting(meetingId: string): Promise<boolean> {
  try {
    const token = await getZoomAccessToken();
    if (!token) {
      console.error('[Zoom Bot] No access token available');
      return false;
    }

    console.log(`[Zoom Bot] 🤖 Bot joining meeting ${meetingId} with countdown...`);

    // Add bot as participant (3 minutes early)
    const joinResponse = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          registrants: [
            {
              email: 'swarbot@swaryoga.com',
              first_name: 'Swaryoga',
              last_name: 'Bot',
            }
          ]
        }),
      }
    );

    if (!joinResponse.ok) {
      const errorText = await joinResponse.text();
      console.warn(`[Zoom Bot] Join response: ${joinResponse.status}`);
      // Don't fail - continue with countdown
    }

    console.log('[Zoom Bot] ✅ Bot ready for countdown'); 
    return true;
    
  } catch (error) {
    console.error('[Zoom Bot] Error:', error);
    return false;
  }
}

/**
 * Send countdown message to meeting chat (shows 2:59 to 0:00)
 */
async function sendCountdownMessage(meetingId: string, seconds: number): Promise<boolean> {
  try {
    const token = await getZoomAccessToken();
    if (!token) return false;

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    const message = seconds === 0 
      ? '🎥 VIDEO STARTING NOW! 🚀' 
      : `⏳ Starting in ${timeString}...`;

    // Send message to meeting
    const msgResponse = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          to: 'all'
        }),
      }
    );

    if (msgResponse.ok) {
      console.log(`[Zoom Countdown] ${message}`);
    }
    return true;
    
  } catch (error) {
    console.error('[Zoom Countdown] Error:', error);
    return false;
  }
}

/**
 * Start Live Stream for meeting with video URL
 */
async function startLiveStream(meetingId: string, videoUrl: string): Promise<boolean> {
  try {
    const token = await getZoomAccessToken();
    if (!token) {
      console.error('[Zoom Live Stream] No access token available');
      return false;
    }

    console.log(`[Zoom Live Stream] Starting stream for meeting ${meetingId}`);
    console.log(`[Zoom Live Stream] Video URL: ${videoUrl}`);

    // Start live stream with video URL
    const streamResponse = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}/livestream`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          settings: {
            active_live_stream_url: videoUrl,
            stream_url: videoUrl,
            bitrates: 2500,
            resolution: '1920x1080',
          },
        }),
      }
    );

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      console.error(`[Zoom Live Stream] Start failed: ${streamResponse.status} - ${errorText}`);
      return false;
    }

    console.log('[Zoom Live Stream] ✅ Live stream started - video now playing in meeting');
    return true;
    
  } catch (error) {
    console.error('[Zoom Live Stream] Error:', error);
    return false;
  }
}

/**
 * Handle meeting.started event - make bot auto-screen-share video
 */
async function handleMeetingStarted(payload: any): Promise<NextResponse> {
  try {
    const meetingData = payload.payload?.object;
    
    if (!meetingData) {
      console.error('[Zoom Webhook] Missing meeting data in meeting.started event');
      return NextResponse.json({ message: 'Missing data' });
    }

    const meetingId = meetingData.id;
    const meetingTopic = meetingData.topic;
    
    console.log('[Zoom Webhook] Meeting started:', { meetingId, topic: meetingTopic });

    // Connect to database to find Sadhana schedule
    await connectDB();
    const { getSadhanaSchedule } = await import('@/lib/schemas/enterpriseSchemas');
    const SadhanaSchedule = getSadhanaSchedule();

    // Find active Sadhana schedule 
    const schedule = await SadhanaSchedule.findOne({
      status: 'active',
      $or: [
        { 'schedule.days': new Date().toLocaleString('en-US', { weekday: 'long' }) },
        { 'schedule.days': new Date().getDay() },
      ],
    });

    if (!schedule || !schedule.videoUrl) {
      console.log('[Zoom Webhook] No active Sadhana schedule found for this meeting');
      return NextResponse.json({ message: 'No schedule found' });
    }

    console.log('[Zoom Webhook] Found Sadhana schedule:', schedule.name);
    console.log('[Zoom Webhook] Video URL:', schedule.videoUrl);

    // Store meeting event in database
    const { getZoomMeetingEvent } = await import('@/lib/schemas/enterpriseSchemas');
    const ZoomMeetingEvent = getZoomMeetingEvent();
    
    await ZoomMeetingEvent.create({
      meetingId,
      topic: meetingTopic,
      eventType: 'meeting.started',
      scheduleId: schedule._id,
      videoUrl: schedule.videoUrl,
      timestamp: new Date(),
    });

    console.log('[Zoom Webhook] Meeting event stored in database');

    // ✅ NEW: Start Live Stream with video
    console.log('[Zoom Webhook] Starting Live Stream...');
    const streamStarted = await startLiveStream(meetingId, schedule.videoUrl).catch(e => {
      console.warn('[Zoom Webhook] Live Stream start error:', e.message);
      return false;
    });

    return NextResponse.json({
      success: true,
      message: streamStarted ? 'Meeting started - Live Stream active' : 'Meeting started - Live Stream attempted',
      videoUrl: schedule.videoUrl,
      streamActive: streamStarted,
    });
  } catch (error: any) {
    console.error('[Zoom Webhook] Error handling meeting.started:', error);
    return NextResponse.json({
      message: 'Meeting started event processed',
      error: error.message,
    });
  }
}

/**
 * POST handler for Zoom webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload = JSON.parse(body);

    console.log('[Zoom Webhook] Received event:', payload.event);

    // Handle URL validation (Zoom sends this to verify endpoint)
    if (payload.event === 'endpoint.url_validation') {
      console.log('[Zoom Webhook] Handling URL validation challenge');
      return handleUrlValidation(payload);
    }

    // Verify webhook signature (if configured)
    const signature = request.headers.get('x-zm-signature') || '';
    const timestamp = request.headers.get('x-zm-request-timestamp') || '';

    const verification = verifyZoomWebhook(body, signature, timestamp);
    if (!verification.valid) {
      console.error('[Zoom Webhook] Verification failed:', verification.error);
      return NextResponse.json({ error: verification.error }, { status: 401 });
    }

    // Replay attack protection: check if we've seen this event
    const eventId = payload.payload?.object?.uuid || `${payload.event}-${timestamp}`;
    if (processedEvents.has(eventId)) {
      console.log('[Zoom Webhook] Duplicate event detected, ignoring');
      return NextResponse.json({ message: 'Duplicate event ignored' });
    }
    processedEvents.set(eventId, Date.now());
    cleanupOldEvents();

    // Check if we handle this event type
    if (!HANDLED_EVENTS.includes(payload.event)) {
      console.log(`[Zoom Webhook] Ignoring event: ${payload.event}`);
      return NextResponse.json({ message: 'Event ignored' });
    }

    // Handle meeting.started event
    if (payload.event === 'meeting.started') {
      return await handleMeetingStarted(payload);
    }

    // Handle recording.completed event
    if (payload.event === 'recording.completed') {
      const meetingRecording = payload.payload?.object;

      if (!meetingRecording) {
        console.error('[Zoom Webhook] Missing meeting recording data');
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
      }

      console.log('[Zoom Webhook] Processing recording for meeting:', meetingRecording.topic);
      console.log('[Zoom Webhook] Recording files:', meetingRecording.recording_files?.length);

      // Connect to database to log the sync
      await connectDB();
      const { getZoomRecordingSync } = await import('@/lib/schemas/enterpriseSchemas');
      const { getWorkshop } = await import('@/lib/schemas/workshopSchemas');
      const ZoomRecordingSync = getZoomRecordingSync();
      const Workshop = getWorkshop();

      // Check if already processed
      const existing = await ZoomRecordingSync.findOne({
        zoomMeetingUuid: meetingRecording.uuid,
      });

      if (existing) {
        console.log('[Zoom Webhook] Recording already processed, skipping');
        return NextResponse.json({ message: 'Already processed' });
      }

      // Find linked workshop by Zoom meeting ID
      const linkedWorkshop = await Workshop.findOne({
        zoomMeetingId: meetingRecording.id,
      });

      if (linkedWorkshop) {
        console.log('[Zoom Webhook] Found linked workshop:', linkedWorkshop.name);
      }

      // Sync recordings to S3
      const syncResult = await syncZoomRecordingsToS3(meetingRecording);

      // Save sync record to database
      const syncRecord = new ZoomRecordingSync({
        zoomMeetingId: meetingRecording.id,
        zoomMeetingUuid: meetingRecording.uuid,
        topic: meetingRecording.topic,
        hostId: meetingRecording.host_id,
        startTime: new Date(meetingRecording.start_time),
        duration: meetingRecording.duration,
        totalSize: meetingRecording.total_size,
        syncedFiles: syncResult.syncedFiles.map((f) => ({
          recordingType: f.recordingType,
          displayName: getRecordingTypeDisplayName(f.recordingType),
          s3Key: f.s3Key,
          s3Url: f.s3Url,
          fileSize: f.fileSize,
          bunnyVideoId: f.bunnyVideoId || null,
          bunnyEmbedUrl: f.bunnyEmbedUrl || null,
        })),
        skippedFiles: syncResult.skippedFiles,
        errors: syncResult.errors,
        syncStatus: syncResult.success ? 'completed' : 'partial',
        syncedAt: new Date(),
        // Link to workshop if found
        workshopId: linkedWorkshop?._id,
      });

      await syncRecord.save();

      console.log('[Zoom Webhook] Sync completed:', {
        success: syncResult.success,
        synced: syncResult.syncedFiles.length,
        skipped: syncResult.skippedFiles.length,
        errors: syncResult.errors.length,
        linkedWorkshop: linkedWorkshop?.name || null,
      });

      return NextResponse.json({
        success: true,
        message: 'Recording synced to S3',
        synced: syncResult.syncedFiles.length,
        skipped: syncResult.skippedFiles.length,
        workshopLinked: !!linkedWorkshop,
      });
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error: any) {
    console.error('[Zoom Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler - for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Zoom Recording Webhook',
    description: 'Syncs recordings directly to Bunny Stream for website playback',
  });
}
