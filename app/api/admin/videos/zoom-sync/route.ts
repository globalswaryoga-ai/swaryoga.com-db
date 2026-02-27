/**
 * Zoom Recording → Bunny Stream Sync API
 * 
 * GET  /api/admin/videos/zoom-sync?meetingId=xxx
 *   Preview: check what recordings exist on Zoom, grouped by day.
 *
 * POST /api/admin/videos/zoom-sync
 *   Sync: downloads recordings from Zoom, uploads to Bunny Stream,
 *   creates PlaylistVideo entries with correct day numbers + shortCodes.
 *   Returns SSE stream with real-time progress events.
 *
 * Body: { meetingId, speakerPlaylistId?, galleryPlaylistId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, PlaylistVideo, VideoPlaylist } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getZoomAccessToken, syncZoomToBunny, SyncProgressEvent } from '@/lib/zoom-s3-sync';
import crypto from 'crypto';

const ZOOM_API = 'https://api.zoom.us/v2';

/** Generate a unique 7-char short code */
async function generateShortCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(5).toString('base64url').slice(0, 7);
    const exists = await PlaylistVideo.findOne({ shortCode: code });
    if (!exists) return code;
  }
  return crypto.randomBytes(8).toString('base64url').slice(0, 7);
}

export async function POST(request: NextRequest) {
  // Parse body and authenticate before setting up SSE
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let decoded: any;
  try {
    decoded = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }
  if (!decoded || !decoded.isAdmin) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const { meetingId, speakerPlaylistId, galleryPlaylistId } = body;
  if (!meetingId) {
    return NextResponse.json({ success: false, error: 'Zoom Meeting ID is required' }, { status: 400 });
  }

  const cleanMeetingId = String(meetingId).replace(/\s+/g, '');

  // ── SSE stream for real-time progress ──────────────────────────
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: string, data: any) => {
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch { /* stream may be closed */ }
  };

  // Run sync in background while streaming progress
  (async () => {
    try {
      await connectDB();

      // ── Fetch recordings from Zoom ───────────────────────────────
      await sendEvent('progress', { type: 'start', percent: 0, message: 'Connecting to Zoom...' });

      const accessToken = await getZoomAccessToken();

      let recordingsRes = await fetch(`${ZOOM_API}/meetings/${cleanMeetingId}/recordings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (recordingsRes.status === 400) {
        const errCheck = await recordingsRes.text();
        if (errCheck.includes('scope') || errCheck.includes('scopes')) {
          console.log('[zoom-sync POST] Falling back to /users/me/recordings endpoint');
          recordingsRes = await fetch(
            `${ZOOM_API}/users/me/recordings?meeting_id=${cleanMeetingId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
        } else {
          recordingsRes = new Response(errCheck, { status: 400, statusText: 'Bad Request' });
        }
      }

      if (!recordingsRes.ok) {
        const errText = await recordingsRes.text();
        let errorMessage = errText;
        try { const p = JSON.parse(errText); if (p.message) errorMessage = p.message; } catch {}
        await sendEvent('error', { message: `Zoom API error (${recordingsRes.status}): ${errorMessage}` });
        await writer.close();
        return;
      }

      const rawData = await recordingsRes.json();
      const recordingsData = rawData.meetings
        ? rawData.meetings.find((m: any) => String(m.id) === cleanMeetingId) || rawData.meetings[0]
        : rawData;

      if (!recordingsData?.recording_files?.length) {
        await sendEvent('error', { message: 'No recording files found for this meeting.' });
        await writer.close();
        return;
      }

      await sendEvent('progress', { type: 'start', percent: 5, message: `Found ${recordingsData.recording_files.length} recording file(s). Starting sync...` });

      // ── Download from Zoom → Upload to Bunny Stream ──────────────
      const syncResult = await syncZoomToBunny(recordingsData, async (evt: SyncProgressEvent) => {
        // Scale progress: 5-85% for download/upload, rest for DB
        const scaledPercent = 5 + Math.round(evt.percent * 0.8);
        await sendEvent('progress', {
          type: evt.type,
          percent: scaledPercent,
          message: evt.message,
          fileIndex: evt.fileIndex,
          totalFiles: evt.totalFiles,
          recordingType: evt.recordingType,
          dayNumber: evt.dayNumber,
          fileSizeMB: evt.fileSizeMB,
        });
      });

      if (!syncResult.success && syncResult.syncedFiles.length === 0) {
        await sendEvent('error', { message: `Sync failed: ${syncResult.errors.join('; ')}` });
        await writer.close();
        return;
      }

      // ── Create PlaylistVideo entries ─────────────────────────────
      await sendEvent('progress', { type: 'saving', percent: 88, message: 'Saving video entries to database...' });

      const speakerPlaylist = speakerPlaylistId ? await VideoPlaylist.findById(speakerPlaylistId) : null;
      const galleryPlaylist = galleryPlaylistId ? await VideoPlaylist.findById(galleryPlaylistId) : null;
      const sessionPlan: Array<{ day: number; topic: string }> = speakerPlaylist?.sessionPlan || galleryPlaylist?.sessionPlan || [];
      const dayTopicMap = new Map<number, string>();
      for (const s of sessionPlan) dayTopicMap.set(s.day, s.topic);

      const createdVideos: any[] = [];

      for (const syncedFile of syncResult.syncedFiles) {
        const isSpeaker = syncedFile.recordingType.includes('speaker');
        const isGallery = syncedFile.recordingType.includes('gallery');

        let targetPlaylistId: string | undefined;
        if (isSpeaker && speakerPlaylistId) targetPlaylistId = speakerPlaylistId;
        else if (isGallery && galleryPlaylistId) targetPlaylistId = galleryPlaylistId;
        else if (speakerPlaylistId) targetPlaylistId = speakerPlaylistId;
        else if (galleryPlaylistId) targetPlaylistId = galleryPlaylistId;

        if (!targetPlaylistId || !syncedFile.bunnyVideoId) continue;

        try {
          const existing = await PlaylistVideo.findOne({ playlistId: targetPlaylistId, bunnyVideoId: syncedFile.bunnyVideoId });
          if (existing) continue;

          const dayNumber = syncedFile.dayNumber;
          const sessionTopic = dayTopicMap.get(dayNumber) || '';
          const typeName = isSpeaker ? 'Speaker View' : isGallery ? 'Gallery View' : syncedFile.recordingType;
          const shortCode = await generateShortCode();

          const video = await PlaylistVideo.create({
            playlistId: targetPlaylistId,
            title: `Day ${dayNumber} - ${sessionTopic || recordingsData.topic || 'Zoom Recording'}`,
            sessionTitle: sessionTopic,
            description: `Auto-imported from Zoom (${typeName}) — ${syncedFile.recordingDate}`,
            videoUrl: syncedFile.bunnyEmbedUrl,
            bunnyVideoId: syncedFile.bunnyVideoId,
            bunnyEmbedUrl: syncedFile.bunnyEmbedUrl,
            videoType: isSpeaker ? 'speaker' : isGallery ? 'gallery' : 'other',
            duration: 0,
            sortOrder: dayNumber - 1,
            sessionNumber: dayNumber,
            shortCode,
            status: 'active',
            tags: ['zoom-auto-sync'],
          });
          createdVideos.push(video);
          await VideoPlaylist.findByIdAndUpdate(targetPlaylistId, { $inc: { videoCount: 1 } });
          console.log(`[Zoom Sync] Created video: Day ${dayNumber} (${typeName}) → ${shortCode}`);
        } catch (err: any) {
          console.error(`[Zoom Sync] Failed to create video entry:`, err.message);
        }
      }

      const uniqueDays = new Set(syncResult.syncedFiles.map(f => f.dayNumber));
      const message = `Synced ${uniqueDays.size} day(s) — ${syncResult.syncedFiles.length} recording(s) to Bunny Stream, created ${createdVideos.length} video entries.`;

      await sendEvent('done', {
        success: true,
        percent: 100,
        message,
        data: {
          syncedFiles: syncResult.syncedFiles.length,
          uniqueDays: uniqueDays.size,
          createdVideos: createdVideos.length,
          skippedFiles: syncResult.skippedFiles,
          errors: syncResult.errors,
        },
      });
    } catch (error: any) {
      console.error('[Zoom Sync API] Error:', error);
      await sendEvent('error', { message: error.message });
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * GET /api/admin/videos/zoom-sync?meetingId=xxx
 * Preview: check what recordings exist, grouped by day.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'meetingId is required' }, { status: 400 });
    }

    const cleanMeetingId = meetingId.replace(/\s+/g, '');
    const accessToken = await getZoomAccessToken();

    // Try meeting-specific endpoint first, fall back to user recordings list
    let res = await fetch(`${ZOOM_API}/meetings/${cleanMeetingId}/recordings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // If scope error (400), fall back to account-level recordings endpoint
    if (res.status === 400) {
      const errCheck = await res.text();
      if (errCheck.includes('scope') || errCheck.includes('scopes')) {
        console.log('[zoom-sync GET] Falling back to /users/me/recordings endpoint');
        res = await fetch(
          `${ZOOM_API}/users/me/recordings?meeting_id=${cleanMeetingId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } else {
        let parsed: any = {};
        try { parsed = JSON.parse(errCheck); } catch {}
        const zoomMsg = parsed.message || errCheck;
        console.error(`[Zoom Sync GET] Zoom API 400:`, zoomMsg);
        return NextResponse.json({
          success: false,
          error: `Zoom API error (400): ${zoomMsg}`,
        }, { status: 400 });
      }
    }

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({
          success: true,
          data: { hasRecordings: false, recordings: [], days: [], message: 'No recordings found' },
        });
      }
      const errText = await res.text();
      let parsed: any = {};
      try { parsed = JSON.parse(errText); } catch {}
      const zoomMsg = parsed.message || errText;
      console.error(`[Zoom Sync GET] Zoom API ${res.status}:`, zoomMsg);
      return NextResponse.json({
        success: false,
        error: `Zoom API error (${res.status}): ${zoomMsg}`,
      }, { status: 400 });
    }

    const rawData = await res.json();

    // Normalize: /users/me/recordings returns { meetings: [...] }
    // while /meetings/{id}/recordings returns the meeting object directly
    const data = rawData.meetings
      ? rawData.meetings.find((m: any) => String(m.id) === cleanMeetingId) || rawData.meetings[0]
      : rawData;

    if (!data) {
      return NextResponse.json({
        success: true,
        data: { hasRecordings: false, recordings: [], days: [], message: 'No recordings found for this meeting ID' },
      });
    }

    // Build per-file info
    const files = (data.recording_files || []).map((f: any) => ({
      id: f.id,
      type: f.recording_type,
      fileType: f.file_type,
      fileSize: f.file_size,
      status: f.status,
      start: f.recording_start,
      end: f.recording_end,
    }));

    // Group by date to show day breakdown
    const dayGroups: Record<string, { date: string; dayNumber: number; recordings: any[] }> = {};
    const allDates = [...new Set(files.map((f: any) => f.start?.split('T')[0]).filter(Boolean))].sort() as string[];
    
    for (const f of files) {
      const dateStr = f.start?.split('T')[0] || 'unknown';
      if (!dayGroups[dateStr]) {
        const dayNum = allDates.indexOf(dateStr) + 1;
        dayGroups[dateStr] = { date: dateStr, dayNumber: dayNum, recordings: [] };
      }
      dayGroups[dateStr].recordings.push(f);
    }

    const days = Object.values(dayGroups).sort((a, b) => a.dayNumber - b.dayNumber);
    const totalSizeMB = files.reduce((sum: number, f: any) => sum + (f.fileSize || 0), 0) / (1024 * 1024);

    return NextResponse.json({
      success: true,
      data: {
        hasRecordings: files.length > 0,
        topic: data.topic,
        startTime: data.start_time,
        duration: data.duration,
        totalFiles: files.length,
        totalDays: days.length,
        totalSizeMB: Math.round(totalSizeMB),
        recordings: files,
        days,
      },
    });
  } catch (error: any) {
    console.error('[Zoom Sync API] GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
