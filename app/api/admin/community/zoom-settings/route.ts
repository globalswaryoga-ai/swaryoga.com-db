import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { fetchFromStorage, uploadToPath } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

const MAPPINGS_FILE_KEY = 'config/zoom-mappings.json';

// Helper to get mappings from Bunny Storage
async function getMappings() {
  try {
    const { buffer } = await fetchFromStorage(MAPPINGS_FILE_KEY);
    return JSON.parse(buffer.toString('utf-8'));
  } catch (error) {
    // File doesn't exist yet, return empty array
    return [];
  }
}

// Helper to save mappings to Bunny Storage
async function saveMappings(mappings: any[]) {
  const buffer = Buffer.from(JSON.stringify(mappings, null, 2), 'utf-8');
  await uploadToPath(buffer, MAPPINGS_FILE_KEY, 'application/json');
}

/**
 * GET /api/admin/community/zoom-settings
 * List all Zoom → Community mappings
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const mappings = await getMappings();

    return NextResponse.json({
      success: true,
      mappings: mappings.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error: any) {
    console.error('[Bunny Zoom Settings GET]', error);
    return NextResponse.json({ error: error?.message || 'Failed to load Bunny Zoom settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!admin(request)?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const body = await request.json();
    const { zoomMeetingId, communityId, zoomTopic, thumbnailUrl, googleFormUrl, crmFormId } = body;

    if (!zoomMeetingId || !communityId) {
      return NextResponse.json(
        { error: 'zoomMeetingId and communityId are required' },
        { status: 400 }
      );
    }

    const mappings = await getMappings();

    if (mappings.some((m: any) => m.zoomMeetingId === zoomMeetingId)) {
      return NextResponse.json(
        { error: `Zoom meeting ${zoomMeetingId} already mapped` },
        { status: 409 }
      );
    }

    // Create mapping document (generate a random ID string)
    const mapping = {
      _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      zoomMeetingId,
      communityId,
      communityName: communityId, // Since we bypass Mongo, we just store the ID directly
      zoomTopic: zoomTopic || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      youtubePlaylistName: body.youtubePlaylistName || undefined,
      googleFormUrl: googleFormUrl || undefined,
      crmFormId: crmFormId || undefined,
      createdAt: new Date(),
    };

    mappings.push(mapping);
    await saveMappings(mappings);

    return NextResponse.json({
      success: true,
      mapping,
    });
  } catch (error: any) {
    console.error('[Bunny Zoom Settings POST]', error);
    return NextResponse.json({ error: error?.message || 'Failed to save Bunny Zoom mapping' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/community/zoom-settings
 * Update fields on an existing Zoom → Community mapping (e.g. youtubePlaylistName).
 * Body: { id, zoomTopic?, thumbnailUrl?, youtubePlaylistName?, googleFormUrl?, crmFormId? }
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!admin(request)?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const body = await request.json();
    const { id, zoomTopic, thumbnailUrl, youtubePlaylistName, googleFormUrl, crmFormId } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const mappings = await getMappings();
    const index = mappings.findIndex((m: any) => m._id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    let hasUpdates = false;
    if (zoomTopic !== undefined) { mappings[index].zoomTopic = zoomTopic; hasUpdates = true; }
    if (thumbnailUrl !== undefined) { mappings[index].thumbnailUrl = thumbnailUrl; hasUpdates = true; }
    if (youtubePlaylistName !== undefined) { mappings[index].youtubePlaylistName = youtubePlaylistName; hasUpdates = true; }
    if (googleFormUrl !== undefined) { mappings[index].googleFormUrl = googleFormUrl; hasUpdates = true; }
    if (crmFormId !== undefined) { mappings[index].crmFormId = crmFormId; hasUpdates = true; }

    if (!hasUpdates) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await saveMappings(mappings);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Bunny Zoom Settings PATCH]', error);
    return NextResponse.json({ error: error?.message || 'Failed to update Bunny Zoom mapping' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!admin(request)?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
    }

    const mappings = await getMappings();
    const initialLength = mappings.length;
    
    const filteredMappings = mappings.filter((m: any) => m._id !== id);

    if (filteredMappings.length === initialLength) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    await saveMappings(filteredMappings);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Bunny Zoom Settings DELETE]', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete Bunny Zoom mapping' }, { status: 500 });
  }
}
