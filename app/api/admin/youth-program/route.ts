/**
 * Youth Program Community Setup API
 * 
 * POST - Create Youth Program community and sync Zoom recordings
 * GET - Get Youth community and its recordings
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, Community, CommunityVideo } from '@/lib/db';
import { getZoomAccessToken } from '@/lib/zoom-s3-sync';
import { COMMUNITY_TYPES } from '@/lib/community-manager';

const YOUTH_MEETING_ID = '83376917306';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Find Youth community
    const youthCommunity = await Community.findOne({
      name: { $regex: /youth/i },
    });

    if (!youthCommunity) {
      return NextResponse.json({
        success: true,
        exists: false,
        message: 'Youth community not created yet. Use POST to create.',
      });
    }

    // Get recordings
    const recordings = await CommunityVideo.find({
      communityId: youthCommunity._id.toString(),
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      exists: true,
      community: {
        id: youthCommunity._id,
        name: youthCommunity.name,
        description: youthCommunity.description,
        type: youthCommunity.type,
        memberCount: youthCommunity.members?.length || 0,
      },
      recordingsCount: recordings.length,
      recordings: recordings.map(r => ({
        id: r._id,
        title: r.title,
        description: r.description,
        s3Key: r.s3Key,
        recordingType: r.recordingType,
        source: r.source,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to get youth community' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { action } = body;

    if (action === 'create-community') {
      // Create Youth Program community (as old_sadhak type since it's completed)
      let youthCommunity = await Community.findOne({
        name: { $regex: /youth.*program/i },
      });

      if (youthCommunity) {
        return NextResponse.json({
          success: true,
          message: 'Youth community already exists',
          community: {
            id: youthCommunity._id,
            name: youthCommunity.name,
            type: youthCommunity.type,
          },
        });
      }

      youthCommunity = await Community.create({
        id: 'youth-program-sadhak',
        name: 'Youth Program Sadhak',
        description: 'Community for Youth Program participants. Access workshop recordings and connect with fellow practitioners.',
        type: COMMUNITY_TYPES.OLD_SADHAK, // Treat as alumni community
        isArchived: false,
        mergedWorkshopIds: [],
      });

      return NextResponse.json({
        success: true,
        message: 'Youth Program community created!',
        community: {
          id: youthCommunity._id,
          name: youthCommunity.name,
          type: youthCommunity.type,
        },
      });
    }

    if (action === 'list-zoom-recordings') {
      // Try to list recordings from Zoom
      try {
        const accessToken = await getZoomAccessToken();
        
        // Get recordings for the meeting
        const res = await fetch(
          `https://api.zoom.us/v2/meetings/${YOUTH_MEETING_ID}/recordings`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!res.ok) {
          const error = await res.json();
          return NextResponse.json({
            success: false,
            error: 'Zoom API error',
            details: error,
            help: 'Your Zoom app needs the "cloud_recording:read" scope. Go to Zoom Marketplace → Your App → Scopes → Add "cloud_recording:read:list_recording_files" scope.',
          }, { status: 400 });
        }

        const data = await res.json();
        return NextResponse.json({
          success: true,
          topic: data.topic,
          startTime: data.start_time,
          duration: data.duration,
          recordingCount: data.recording_files?.length || 0,
          recordings: data.recording_files?.map((f: any) => ({
            id: f.id,
            type: f.recording_type,
            fileType: f.file_type,
            sizeMB: (f.file_size / 1024 / 1024).toFixed(1),
            status: f.status,
          })),
        });
      } catch (zoomError: any) {
        return NextResponse.json({
          success: false,
          error: zoomError.message,
          help: 'Add "cloud_recording:read:list_recording_files" scope to your Zoom app',
        }, { status: 400 });
      }
    }

    if (action === 'add-recording') {
      // Manually add a recording to the community
      const { title, description, s3Key, recordingType, zoomRecordingId, duration } = body;

      if (!title || !s3Key) {
        return NextResponse.json({ error: 'title and s3Key are required' }, { status: 400 });
      }

      // Find Youth community
      const youthCommunity = await Community.findOne({
        name: { $regex: /youth/i },
      });

      if (!youthCommunity) {
        return NextResponse.json({ error: 'Youth community not found. Create it first.' }, { status: 404 });
      }

      const video = await CommunityVideo.create({
        communityId: youthCommunity._id.toString(),
        title,
        description: description || '',
        s3Key,
        duration,
        isCommon: true, // Visible to all community members
        source: 'zoom',
        zoomMeetingId: YOUTH_MEETING_ID,
        zoomRecordingId,
        recordingType: recordingType || 'gallery_view',
        uploadedBy: decoded.userId,
        isShareable: false,
      });

      return NextResponse.json({
        success: true,
        message: 'Recording added to Youth community',
        video: {
          id: video._id,
          title: video.title,
          s3Key: video.s3Key,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use: create-community, list-zoom-recordings, add-recording' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
