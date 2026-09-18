import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { createBunnyZoomMapping, deleteBunnyZoomMapping, listBunnyZoomMappings, updateBunnyZoomMapping } from '@/lib/bunnyZoomRepository';

export const dynamic = 'force-dynamic';

function admin(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    if (!admin(request)?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    return NextResponse.json({ success: true, mappings: await listBunnyZoomMappings() });
  } catch (error: any) {
    console.error('[Bunny Zoom Settings GET]', error);
    return NextResponse.json({ error: error?.message || 'Failed to load Bunny Zoom settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!admin(request)?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const body = await request.json();
    const zoomMeetingId = String(body.zoomMeetingId || '').trim();
    const communityId = String(body.communityId || '').trim();
    if (!zoomMeetingId || !communityId) return NextResponse.json({ error: 'zoomMeetingId and communityId are required' }, { status: 400 });
    const existing = (await listBunnyZoomMappings()).find((mapping) => mapping.zoomMeetingId === zoomMeetingId);
    if (existing) return NextResponse.json({ error: `Zoom meeting ${zoomMeetingId} already mapped` }, { status: 409 });
    const mapping = await createBunnyZoomMapping({ zoomMeetingId, communityId, communityName: body.communityName || undefined, zoomTopic: body.zoomTopic || undefined, thumbnailUrl: body.thumbnailUrl || undefined, youtubePlaylistName: body.youtubePlaylistName || undefined });
    return NextResponse.json({ success: true, mapping }, { status: 201 });
  } catch (error: any) {
    console.error('[Bunny Zoom Settings POST]', error);
    return NextResponse.json({ error: error?.message || 'Failed to save Bunny Zoom mapping' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!admin(request)?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const mapping = await updateBunnyZoomMapping(String(body.id), { zoomTopic: body.zoomTopic, thumbnailUrl: body.thumbnailUrl, youtubePlaylistName: body.youtubePlaylistName });
    if (!mapping) return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    return NextResponse.json({ success: true, mapping });
  } catch (error: any) {
    console.error('[Bunny Zoom Settings PATCH]', error);
    return NextResponse.json({ error: error?.message || 'Failed to update Bunny Zoom mapping' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!admin(request)?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
    if (!await deleteBunnyZoomMapping(id)) return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Bunny Zoom Settings DELETE]', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete Bunny Zoom mapping' }, { status: 500 });
  }
}
