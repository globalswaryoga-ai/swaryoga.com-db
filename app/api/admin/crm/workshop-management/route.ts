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
    if (body.thumbnailUrl !== undefined) {
      updates.thumbnailUrl = body.thumbnailUrl ? String(body.thumbnailUrl).trim() : null;
    }
    if (body.communityId !== undefined) {
      updates.communityId = body.communityId ? String(body.communityId).trim() : null;
    }
    if (body.metadata !== undefined) {
      updates.metadata = body.metadata;
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    let cohort: any = null;
    if (Object.keys(updates).length > 0) {
      cohort = await updateCohort(body.cohortId, updates);
      if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    } else {
      cohort = await getCohort(body.cohortId);
    }

    // Sync Zoom community mapping (for zoom-recording-uploader.mjs and community integration)
    const zoomId = body.zoomMeetingId !== undefined 
      ? (body.zoomMeetingId ? String(body.zoomMeetingId).trim() : '')
      : (cohort?.zoomMeetingId || '');

    if (zoomId) {
      const existingMappings = await listBunnyZoomMappings();
      const existing = existingMappings.find(m => m.zoomMeetingId === zoomId);

      let communityName: string | undefined = undefined;
      const targetCommunityId = body.communityId !== undefined 
        ? (body.communityId ? String(body.communityId).trim() : '')
        : (existing?.communityId || cohort?.communityId || '');

      if (targetCommunityId) {
        try {
          const { getBunnyCommunity } = await import('@/lib/bunnyCommunityRepository');
          const comm = await getBunnyCommunity(targetCommunityId);
          if (comm?.name) communityName = comm.name;
        } catch {}
      }

      const mappingFields = {
        communityId: targetCommunityId || 'global',
        communityName: communityName || undefined,
        zoomTopic: cohort?.name || undefined,
        thumbnailUrl: body.thumbnailUrl !== undefined 
          ? (body.thumbnailUrl ? String(body.thumbnailUrl).trim() : undefined) 
          : (cohort?.thumbnailUrl || undefined),
        youtubePlaylistName: body.youtubePlaylistName !== undefined 
          ? (body.youtubePlaylistName ? String(body.youtubePlaylistName).trim() : undefined) 
          : (cohort?.youtubePlaylistName || undefined),
      };

      if (existing) {
        await updateBunnyZoomMapping(existing._id, mappingFields);
      } else {
        await createBunnyZoomMapping({
          zoomMeetingId: zoomId,
          ...mappingFields,
        });
      }

      // Also sync to mongo_documents (socialmediaaccounts.metadata.zoomMappings)
      try {
        const { bunnyExecute } = await import('@/lib/bunnyDatabase');
        const rows = await bunnyExecute({
          sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
        });
        for (const r of rows.rows) {
          try {
            const p = JSON.parse(String(r.document_json || '{}'));
            if (p.platform === 'youtube') {
              const zoomMappings = p.metadata?.zoomMappings || [];
              const idx = zoomMappings.findIndex((m: any) => String(m.zoomMeetingId) === zoomId);
              const updatedEntry = {
                zoomMeetingId: zoomId,
                communityId: mappingFields.communityId,
                communityName: mappingFields.communityName || mappingFields.communityId,
                zoomTopic: mappingFields.zoomTopic,
                thumbnailUrl: mappingFields.thumbnailUrl,
                youtubePlaylistName: mappingFields.youtubePlaylistName,
                updatedAt: new Date().toISOString()
              };
              if (idx >= 0) {
                zoomMappings[idx] = { ...zoomMappings[idx], ...updatedEntry };
              } else {
                zoomMappings.push(updatedEntry);
              }
              p.metadata = { ...(p.metadata || {}), zoomMappings };
              await bunnyExecute({
                sql: "UPDATE mongo_documents SET document_json = ?, updated_at = CURRENT_TIMESTAMP WHERE collection_name = 'socialmediaaccounts' AND document_json LIKE '%\"platform\":\"youtube\"%'",
                args: [JSON.stringify(p)]
              });
              break;
            }
          } catch {}
        }
      } catch (err: any) {
        console.warn('[workshop-management] Failed to sync zoomMappings to mongo_documents:', err.message);
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
