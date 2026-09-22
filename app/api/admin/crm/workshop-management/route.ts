import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCohort, listCohorts, listStudents, listAttendance, listRecordings, saveCohort, updateCohort, editCohort, deleteCohort } from '@/lib/workshopBunnyRepository';
import { listBunnyZoomMappings, createBunnyZoomMapping, updateBunnyZoomMapping } from '@/lib/bunnyZoomRepository';

export const dynamic = 'force-dynamic';

function admin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const cohortId = request.nextUrl.searchParams.get('cohortId');
  if (cohortId) {
    try {
      const cohort = await getCohort(cohortId);
      if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
      const [students, attendance, recordings, zoomMappings] = await Promise.all([listStudents(cohortId), listAttendance(cohortId), listRecordings(cohortId), listBunnyZoomMappings()]);
      const zoomMapping = cohort.zoomMeetingId ? zoomMappings.find(m => m.zoomMeetingId === cohort.zoomMeetingId) || null : null;
      return NextResponse.json({ cohort, students, attendance, recordings, zoomMapping });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load workshop' }, { status: 500 });
    }
  }
  try { return NextResponse.json({ cohorts: await listCohorts() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load workshops' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  try { return NextResponse.json({ cohort: await saveCohort(body, decoded.userId) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save workshop' }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });

  try {
    // Full edit from the Edit Workshop modal
    if (body._fullEdit) {
      const cohort = await editCohort(body.cohortId, body);
      if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
      return NextResponse.json({ cohort });
    }

    // Quick partial updates
    const updates: any = {};
    if (body.googleFormLink !== undefined) {
      const googleFormLink = String(body.googleFormLink || '').trim();
      if (googleFormLink && !/^https?:\/\//i.test(googleFormLink)) {
        return NextResponse.json({ error: 'Google Forms link must start with http:// or https://' }, { status: 400 });
      }
      updates.googleFormLink = googleFormLink || null;
    }
    if (body.zoomMeetingId !== undefined) {
      updates.zoomMeetingId = body.zoomMeetingId ? String(body.zoomMeetingId).trim() : null;
    }
    if (body.youtubePlaylistName !== undefined) {
      updates.youtubePlaylistName = body.youtubePlaylistName ? String(body.youtubePlaylistName).trim() : null;
    }
    
    if (Object.keys(updates).length === 0 && !body.communityId) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    let cohort: any = null;
    if (Object.keys(updates).length > 0) {
      cohort = await updateCohort(body.cohortId, updates);
      if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    if (body.zoomMeetingId && body.communityId) {
      const existingMappings = await listBunnyZoomMappings();
      const existing = existingMappings.find(m => m.zoomMeetingId === body.zoomMeetingId);
      if (existing) {
        await updateBunnyZoomMapping(existing._id, { thumbnailUrl: body.thumbnailUrl || undefined, youtubePlaylistName: body.youtubePlaylistName || undefined });
      } else {
        await createBunnyZoomMapping({ zoomMeetingId: body.zoomMeetingId, communityId: body.communityId, thumbnailUrl: body.thumbnailUrl || undefined, youtubePlaylistName: body.youtubePlaylistName || undefined });
      }
    }

    return NextResponse.json({ cohort });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update workshop' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const cohortId = request.nextUrl.searchParams.get('cohortId');
  if (!cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });
  try {
    await deleteCohort(cohortId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete workshop' }, { status: 500 });
  }
}
