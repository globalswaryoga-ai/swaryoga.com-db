/**
 * Sync Historical Zoom Recordings API
 * 
 * POST - Manually sync recordings from a Zoom meeting to S3 and community
 * This is for historical recordings that were recorded before webhook was set up
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, Community, CommunityVideo } from '@/lib/db';
import { getZoomAccessToken, syncZoomRecordingsToS3 } from '@/lib/zoom-s3-sync';
import { getZoomRecordingSync } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';


// Rate limiting: track last sync time per meeting
const syncCooldowns = new Map<string, number>();
const COOLDOWN_MS = 60000; // 1 minute between syncs for same meeting

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { meetingId, communityId, syncToS3 = true, addToCommunity = true } = body;

    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId is required' }, { status: 400 });
    }

    // Rate limiting check
    const lastSync = syncCooldowns.get(meetingId);
    if (lastSync && Date.now() - lastSync < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - (Date.now() - lastSync)) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSeconds} seconds before syncing this meeting again` },
        { status: 429 }
      );
    }
    syncCooldowns.set(meetingId, Date.now());

    await connectDB();

    // Get Zoom access token
    console.log('[Sync Recordings] Getting Zoom access token...');
    const accessToken = await getZoomAccessToken();

    // Fetch meeting recordings from Zoom API
    console.log(`[Sync Recordings] Fetching recordings for meeting ${meetingId}...`);
    const recordingsUrl = `https://api.zoom.us/v2/meetings/${meetingId}/recordings`;
    
    const res = await fetch(recordingsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('[Sync Recordings] Zoom API error:', error);
      return NextResponse.json({
        success: false,
        error: 'Zoom API error',
        details: error,
        help: error.code === 4711 
          ? 'Add cloud_recording:read:list_recording_files scope to your Zoom app'
          : undefined,
      }, { status: 400 });
    }

    const meetingRecording = await res.json();
    console.log(`[Sync Recordings] Found ${meetingRecording.recording_files?.length || 0} recording files`);

    const results: {
      recordings: Array<{
        date: string;
        topic: string;
        duration: number;
        s3Key?: string;
        s3Url?: string;
        communityVideoId?: string;
        status: string;
      }>;
      synced: number;
      errors: string[];
    } = {
      recordings: [],
      synced: 0,
      errors: [],
    };

    // Check for existing sync record
    const ZoomRecordingSync = getZoomRecordingSync();
    const existingSync = await ZoomRecordingSync.findOne({
      zoomMeetingId: meetingRecording.id,
    });

    if (existingSync && !body.force) {
      console.log('[Sync Recordings] Meeting already synced, returning existing data');
      return NextResponse.json({
        success: true,
        alreadySynced: true,
        existingSync: {
          id: existingSync._id,
          topic: existingSync.topic,
          syncedAt: existingSync.syncedAt,
          files: existingSync.syncedFiles?.length || 0,
        },
        message: 'Meeting already synced. Use force=true to re-sync.',
      });
    }

    // Sync recordings to S3
    if (syncToS3 && meetingRecording.recording_files?.length > 0) {
      console.log('[Sync Recordings] Syncing to S3...');
      
      const syncResult = await syncZoomRecordingsToS3(meetingRecording);

      // Save sync record
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
          displayName: f.recordingType.replace(/_/g, ' '),
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
      });

      await syncRecord.save();

      // Add to community if specified
      if (addToCommunity && communityId && syncResult.syncedFiles.length > 0) {
        console.log(`[Sync Recordings] Adding ${syncResult.syncedFiles.length} videos to community...`);
        
        const community = await Community.findById(communityId);
        if (!community) {
          results.errors.push(`Community ${communityId} not found`);
        } else {
          for (const file of syncResult.syncedFiles) {
            // Only add gallery_view to community
            if (file.recordingType !== 'gallery_view') continue;

            // Check if video already exists
            const existingVideo = await CommunityVideo.findOne({
              communityId: communityId,
              zoomRecordingId: file.s3Key,
            });

            if (existingVideo) {
              console.log(`[Sync Recordings] Video already in community: ${file.s3Key}`);
              continue;
            }

            const videoDate = new Date(meetingRecording.start_time);
            const dayNum = Math.ceil((videoDate.getTime() - new Date('2026-01-05').getTime()) / (1000 * 60 * 60 * 24)) + 1;

            const video = await CommunityVideo.create({
              communityId: communityId,
              title: `${meetingRecording.topic} - Day ${dayNum > 0 ? dayNum : 1}`,
              description: `Recorded on ${videoDate.toLocaleDateString('en-IN', { dateStyle: 'long' })}`,
              s3Key: file.s3Key,
              duration: meetingRecording.duration * 60, // Convert minutes to seconds
              isCommon: true,
              source: 'zoom',
              zoomMeetingId: meetingRecording.id.toString(),
              zoomRecordingId: file.s3Key,
              recordingType: file.recordingType,
              uploadedBy: decoded.userId || decoded.username || 'admin',
              isShareable: false,
            });

            results.recordings.push({
              date: meetingRecording.start_time,
              topic: meetingRecording.topic,
              duration: meetingRecording.duration,
              s3Key: file.s3Key,
              s3Url: file.s3Url,
              communityVideoId: video._id.toString(),
              status: 'synced',
            });
            results.synced++;
          }
        }
      }

      results.recordings.push(...syncResult.syncedFiles.map(f => ({
        date: meetingRecording.start_time,
        topic: meetingRecording.topic,
        duration: meetingRecording.duration,
        s3Key: f.s3Key,
        s3Url: f.s3Url,
        status: 'synced_to_s3',
      })));
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: meetingRecording.id,
        topic: meetingRecording.topic,
        startTime: meetingRecording.start_time,
        duration: meetingRecording.duration,
        totalFiles: meetingRecording.recording_files?.length || 0,
      },
      results,
    });

  } catch (error: any) {
    console.error('[Sync Recordings] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync recordings' },
      { status: 500 }
    );
  }
}

/**
 * GET - List past meetings with recordings for a date range
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
    const topic = searchParams.get('topic');

    // Get Zoom access token
    const accessToken = await getZoomAccessToken();

    // List recordings
    let url = `https://api.zoom.us/v2/users/me/recordings?from=${from}&to=${to}&page_size=100`;
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json({
        success: false,
        error: 'Zoom API error',
        details: error,
        requiredScope: 'cloud_recording:read:list_user_recordings',
      }, { status: 400 });
    }

    const data = await res.json();
    
    // Filter by topic if specified
    let meetings = data.meetings || [];
    if (topic) {
      meetings = meetings.filter((m: any) => 
        m.topic?.toLowerCase().includes(topic.toLowerCase())
      );
    }

    // Check which are already synced
    await connectDB();
    const ZoomRecordingSync = getZoomRecordingSync();
    const syncedMeetings = await ZoomRecordingSync.find({
      zoomMeetingId: { $in: meetings.map((m: any) => m.id) },
    }).select('zoomMeetingId syncedAt').lean();

    const syncedMap = new Map(syncedMeetings.map((s: any) => [s.zoomMeetingId, s.syncedAt]));

    return NextResponse.json({
      success: true,
      from,
      to,
      totalRecordings: data.total_records,
      filteredCount: meetings.length,
      meetings: meetings.map((m: any) => ({
        id: m.id,
        uuid: m.uuid,
        topic: m.topic,
        startTime: m.start_time,
        duration: m.duration,
        totalSize: m.total_size,
        recordingCount: m.recording_count,
        synced: syncedMap.has(m.id),
        syncedAt: syncedMap.get(m.id) || null,
      })),
    });

  } catch (error: any) {
    console.error('[List Recordings] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list recordings' },
      { status: 500 }
    );
  }
}
