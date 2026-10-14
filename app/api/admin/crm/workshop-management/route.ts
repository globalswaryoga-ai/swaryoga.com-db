import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { recordingAccessPolicy } from '@/lib/workshopRecordingAccess';
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
  if (body.autoSyncWhatsappGroup === undefined && body.whatsappGroupLink) body.autoSyncWhatsappGroup = true;
  try { return NextResponse.json({ cohort: await saveCohort(body, decoded.userId) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save workshop' }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });

  try {
    const existing = await getCohort(body.cohortId);
    if (!existing) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    if (!isSuperAdmin(decoded) && existing.createdByUserId !== decoded.userId)
      return NextResponse.json({ error: 'This workshop belongs to another admin' }, { status: 403 });
    if (body.recordingAccess !== undefined) {
      let policy;
      try { policy = recordingAccessPolicy(body.recordingAccess); }
      catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid recording policy' }, { status: 400 }); }
      body.metadata = { ...existing.metadata, ...body.metadata, recordingAccess: policy };
    }
    // Full edit from the Edit Workshop modal
    if (body._fullEdit) {
      const cohort = await editCohort(body.cohortId, body);
      if (body.metadata) await updateCohort(body.cohortId, { metadata: body.metadata });
      if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
      return NextResponse.json({ cohort: await getCohort(body.cohortId) });
    }

    // Quick partial updates
    const updates: any = {};
    if (body.googleFormLink !== undefined) {
      const googleFormLink = String(body.googleFormLink || '').trim();

      updates.googleFormLink = googleFormLink || null;
    }
    if (body.zoomMeetingId !== undefined) {
      const cleaned = body.zoomMeetingId ? String(body.zoomMeetingId).replace(/\D+/g, '') : '';
      updates.zoomMeetingId = cleaned || null;
    }
    if (body.zoomJoinUrl !== undefined) {
      const value = String(body.zoomJoinUrl || '').trim();
      if (value && !/^https?:\/\//i.test(value)) return NextResponse.json({ error: 'Zoom link must begin with http:// or https://' }, { status: 400 });
      updates.zoomJoinUrl = value || null;
    }
    if (body.startDate !== undefined) {
      const value = String(body.startDate || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
        return NextResponse.json({ error: 'A valid workshop start date is required' }, { status: 400 });
      updates.startDate = value;
    }
    if (body.endDate !== undefined) updates.endDate = body.endDate ? String(body.endDate).slice(0, 10) : null;
    if (body.holidayDates !== undefined) {
      if (!Array.isArray(body.holidayDates) || body.holidayDates.some((value: unknown) => value && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))))
        return NextResponse.json({ error: 'Holiday dates must be a list of valid dates' }, { status: 400 });
      updates.holidayDates = body.holidayDates.filter(Boolean);
    }
    if (body.classStartTime !== undefined) updates.classStartTime = body.classStartTime || null;
    if (body.classEndTime !== undefined) updates.classEndTime = body.classEndTime || null;
    if (body.whatsappGroupLink !== undefined) updates.whatsappGroupLink = body.whatsappGroupLink || null;
    if (body.daySubjects !== undefined) {
      if (!Array.isArray(body.daySubjects)) return NextResponse.json({ error: 'Day subjects must be a list' }, { status: 400 });
      updates.daySubjects = body.daySubjects;
    }
    for (const key of ['aiWorkerEnabled', 'autoSyncWhatsappGroup', 'autoSendRecordings', 'autoSyncZoomAttendance', 'autoRecoverZoomTrash']) {
      if (body[key] !== undefined) updates[key] = body[key] === true;
    }
    if (body.name !== undefined) {
      const value = String(body.name || '').trim();
      if (!value) return NextResponse.json({ error: 'Workshop name is required' }, { status: 400 });
      updates.name = value;
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

    const previous = body.previous && typeof body.previous === 'object' ? body.previous : undefined;
    const expectedPrevious = previous
      ? Object.fromEntries(Object.keys(updates).filter(key => Object.prototype.hasOwnProperty.call(previous, key)).map(key => [key, previous[key]]))
      : undefined;
    let cohort: any = null;
    if (Object.keys(updates).length > 0) {
      cohort = await updateCohort(body.cohortId, updates, expectedPrevious);
      if (!cohort) {
        const current = await getCohort(body.cohortId);
        if (!current) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
        if (expectedPrevious && Object.keys(expectedPrevious).length)
          return NextResponse.json({ error: 'This setting changed elsewhere. Reload the workshop before saving again.', cohort: current }, { status: 409 });
        return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
      }
    } else {
      cohort = await getCohort(body.cohortId);
    }

    // Sync Zoom community mapping (for zoom-recording-uploader.mjs and community integration)
    const zoomId = body.zoomMeetingId !== undefined 
      ? (body.zoomMeetingId ? String(body.zoomMeetingId).replace(/\D+/g, '') : '')
      : (cohort?.zoomMeetingId ? String(cohort.zoomMeetingId).replace(/\D+/g, '') : '');

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
