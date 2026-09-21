import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCohort, listRecordings, listStudents, markRecordingDelivered, updateCohort } from '@/lib/workshopBunnyRepository';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';
import { syncWorkshopZoomAttendance } from '@/lib/workshop-zoom-attendance';
import { getZoomMeetingRecordings, deleteZoomRecording } from '@/lib/zoom-meetings';
import { syncZoomToBunny } from '@/lib/zoom-s3-sync';
import { upsertRecording } from '@/lib/workshopBunnyRepository';

function auth(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw);
}

function phoneOf(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}

export async function POST(request: NextRequest) {
  let isAdmin = false;
  let decoded: any = null;
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret === process.env.CRON_SECRET) {
    isAdmin = true;
    decoded = { isAdmin: true, isSuperAdmin: true, userId: 'cron' };
  } else {
    decoded = auth(request);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    isAdmin = true;
  }
  const { cohortId, dryRun = false } = await request.json();
  if (!cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });

  const cohort: any = await getCohort(cohortId);
  if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  if (cohort.createdByUserId && String(cohort.createdByUserId) !== String(decoded.userId) && !decoded.isSuperAdmin) {
    return NextResponse.json({ error: 'This workshop belongs to another admin' }, { status: 403 });
  }

  const students: any[] = await listStudents(cohortId, true);
  const recordings: any[] = (await listRecordings(cohortId)).sort((a, b) => String(a.classDate).localeCompare(String(b.classDate)));
  const result: any = { worker: 'workshop-management', dryRun, studentsChecked: students.length, recordingsChecked: recordings.length, sent: 0, skipped: 0, failed: 0, errors: [] as string[] };
  // Attendance is independent of recording delivery. Run it first so the same
  // AI worker button also refreshes daily Zoom attendance.
  if (cohort.zoomMeetingId) {
    try {
      result.zoomAttendance = await syncWorkshopZoomAttendance(String(cohort._id));
    } catch (error) {
      result.zoomAttendance = { updated: 0, message: error instanceof Error ? error.message : 'Zoom attendance sync failed' };
    }
  }

  // Auto-sync Zoom recordings
  if (cohort.zoomMeetingId && !dryRun) {
    try {
      const zoomRecordingsData = await getZoomMeetingRecordings(cohort.zoomMeetingId);
      if (zoomRecordingsData && zoomRecordingsData.recording_files && zoomRecordingsData.recording_files.length > 0) {
        result.zoomSync = await syncZoomToBunny(zoomRecordingsData);
        
        if (result.zoomSync.syncedFiles && result.zoomSync.syncedFiles.length > 0) {
          // Update DB with the new synced files
          for (const synced of result.zoomSync.syncedFiles) {
             const existingRecording = recordings.find(r => r.classDate === synced.recordingDate);
             let updates: any = {
               cohortId,
               classDate: synced.recordingDate,
               dayNumber: synced.dayNumber,
               zoomMeetingId: cohort.zoomMeetingId,
             };
             if (existingRecording) {
               updates = { ...existingRecording, ...updates };
             }
             if (synced.youtubeVideoId && synced.recordingType.includes('speaker_view')) {
               updates.youtubeSpeakerId = synced.youtubeVideoId;
               updates.youtubeSpeakerUrl = synced.youtubeUrl;
             }
             if (synced.youtubeVideoId && synced.recordingType.includes('gallery_view')) {
               updates.youtubeGalleryId = synced.youtubeVideoId;
               updates.youtubeGalleryUrl = synced.youtubeUrl;
             }
             if (synced.bunnyVideoId && synced.recordingType.includes('speaker_view')) {
               updates.bunnySpeakerUrl = synced.bunnyEmbedUrl;
             }
             if (synced.bunnyVideoId && synced.recordingType.includes('gallery_view')) {
               updates.bunnyGalleryUrl = synced.bunnyEmbedUrl;
             }
             
             await upsertRecording(updates);
          }
          
          // Re-fetch recordings from DB so the WhatsApp sender below uses the new ones
          recordings.length = 0;
          recordings.push(...((await listRecordings(cohortId)).sort((a, b) => String(a.classDate).localeCompare(String(b.classDate)))));
          
          // Auto-delete from Zoom if completely successful
          if (result.zoomSync.success) {
            try {
              await deleteZoomRecording(cohort.zoomMeetingId, 'trash');
              result.zoomDeleted = true;
            } catch (delErr: any) {
              result.zoomDeleteError = delErr.message;
            }
          }
        }
      }
    } catch (syncErr: any) {
      result.zoomSyncError = syncErr.message;
    }
  }

  if (!cohort.aiWorkerEnabled) return NextResponse.json({ success: true, result: { ...result, skipped: recordings.length, message: 'Recording worker is disabled; Zoom attendance/recording sync was still attempted.' } });

  if (!cohort.autoSendRecordings) return NextResponse.json({ success: true, result: { ...result, skipped: recordings.length, message: 'Automatic recording delivery is disabled.' } });

  const bridge = getWhatsAppBridgeConfig();
  const sessionKey = cohort.createdByUserId || decoded.userId;
  const deliveredByStudent = new Map<string, any[]>();
  for (const recording of recordings) {
    const delivered = new Set((recording.deliveredStudentIds || []).map((id: any) => String(id)));
    for (const student of students) {
      if (delivered.has(String(student._id))) { result.skipped++; continue; }
      const phone = phoneOf(student.whatsappNumber || student.phone);
      if (!phone) { result.skipped++; continue; }
      const links = [recording.youtubeSpeakerUrl, recording.youtubeGalleryUrl, recording.bunnySpeakerUrl, recording.bunnyGalleryUrl].filter(Boolean);
      if (!links.length) { result.skipped++; continue; }
      const message = `Workshop ${cohort.name} — Day ${recording.dayNumber || ''}\n\nYour class recording is ready:\n${links.join('\n')}`;
      if (dryRun) { result.sent++; continue; }
      try {
        const response = await fetch(`${bridge.url}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-bridge-secret': bridge.secret, 'x-user-id': String(cohort.createdByUserId || decoded.userId), 'x-session-key': sessionKey, 'x-tenant-id': sessionKey },
          body: JSON.stringify({ to: `${phone}@c.us`, type: 'text', message }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`WhatsApp bridge returned ${response.status}`);
        result.sent++;
        const list = deliveredByStudent.get(String(recording._id)) || [];
        list.push(student._id);
        deliveredByStudent.set(String(recording._id), list);
      } catch (error) {
        result.failed++;
        result.errors.push(`${student.name}: ${error instanceof Error ? error.message : 'send failed'}`);
      }
    }
  }

  if (!dryRun) {
    for (const recording of recordings) {
      const newlyDelivered = deliveredByStudent.get(String(recording._id)) || [];
      if (newlyDelivered.length) await markRecordingDelivered(String(recording._id), newlyDelivered.map(String));
    }
    await updateCohort(cohortId, { workerLastRunAt: new Date().toISOString() });
  }
  return NextResponse.json({ success: true, result });
}
