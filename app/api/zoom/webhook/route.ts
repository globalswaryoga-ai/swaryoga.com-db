/**
 * Zoom Webhook Endpoint
 * Receives recording.completed events and syncs to AWS S3
 * Only saves: speaker_view and gallery_view recordings
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { syncZoomRecordingsToS3, getRecordingTypeDisplayName } from '@/lib/zoom-s3-sync';
import * as crypto from 'crypto';

// Zoom webhook event types we handle
const HANDLED_EVENTS = ['recording.completed'];

/**
 * Verify Zoom webhook signature (optional but recommended)
 */
function verifyZoomWebhook(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  if (!secretToken) {
    console.log('[Zoom Webhook] No secret token configured, skipping verification');
    return true; // Skip verification if no secret configured
  }

  const message = `v0:${timestamp}:${payload}`;
  const hashForVerify = crypto
    .createHmac('sha256', secretToken)
    .update(message)
    .digest('hex');

  const expectedSignature = `v0=${hashForVerify}`;
  return signature === expectedSignature;
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

    if (!verifyZoomWebhook(body, signature, timestamp)) {
      console.error('[Zoom Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Check if we handle this event type
    if (!HANDLED_EVENTS.includes(payload.event)) {
      console.log(`[Zoom Webhook] Ignoring event: ${payload.event}`);
      return NextResponse.json({ message: 'Event ignored' });
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
    description: 'Syncs speaker_view and gallery_view recordings to AWS S3',
  });
}
