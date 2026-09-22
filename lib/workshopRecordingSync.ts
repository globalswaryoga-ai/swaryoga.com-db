import { getCohort, listCohorts, listRecordings, upsertRecording } from '@/lib/workshopBunnyRepository';
import { getZoomAccessToken } from '@/lib/zoom-s3-sync';

interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_extension: string;
  file_size: number;
  play_url?: string;
  download_url?: string;
  status: string;
  recording_type: string;
}

interface ZoomMeetingRecord {
  uuid: string;
  id: number | string;
  topic: string;
  start_time: string;
  duration?: number;
  total_size?: number;
  recording_count?: number;
  share_url?: string;
  password?: string;
  recording_play_passcode?: string;
  recording_files: ZoomRecordingFile[];
}

const SPEAKER_TYPES = new Set([
  'speaker_view',
  'active_speaker',
  'shared_screen_with_speaker_view',
  'shared_screen_with_active_speaker',
]);

const GALLERY_TYPES = new Set([
  'gallery_view',
  'shared_screen_with_gallery_view',
]);

/**
 * Sync Zoom Cloud recordings for a given cohort into workshop_recordings_sql
 */
export async function syncZoomRecordingsForCohort(cohortId: string): Promise<{
  success: boolean;
  count: number;
  syncedDates: string[];
  message: string;
}> {
  const cohort = await getCohort(cohortId);
  if (!cohort) {
    throw new Error('Workshop cohort not found');
  }

  const zoomMeetingId = cohort.zoomMeetingId ? String(cohort.zoomMeetingId).trim() : '';
  if (!zoomMeetingId) {
    return {
      success: false,
      count: 0,
      syncedDates: [],
      message: 'No Zoom Meeting ID is configured for this workshop.',
    };
  }

  const accessToken = await getZoomAccessToken();
  const tokenSnippet = accessToken ? `${accessToken.slice(0, 10)}... (len ${accessToken.length})` : 'EMPTY';
  console.log('[Zoom Sync] Token obtained:', tokenSnippet);
  const debugLogs: string[] = [`token=${tokenSnippet}`];

  const startDate = cohort.startDate ? String(cohort.startDate).slice(0, 10) : '2026-08-01';
  // Zoom 'to' parameter is exclusive in UTC, so query through tomorrow
  const today = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const fromDate = new Date(new Date(startDate).getTime() - 7 * 86400000).toISOString().slice(0, 10);

  const meetingInstances: ZoomMeetingRecord[] = [];

  // A. Fetch from users/me/recordings
  try {
    const listRes = await fetch(
      `https://api.zoom.us/v2/users/me/recordings?from=${fromDate}&to=${today}&page_size=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      }
    );
    const listData = await listRes.json();
    debugLogs.push(`users/me status=${listRes.status}, total=${listData.total_records || 0}`);
    if (listRes.ok) {
      const matched = (listData.meetings || []).filter(
        (m: any) => String(m.id).trim() === zoomMeetingId
      );
      debugLogs.push(`matched=${matched.length} of ${listData.meetings?.length || 0}`);
      meetingInstances.push(...matched);
    } else {
      debugLogs.push(`users/me error: ${JSON.stringify(listData)}`);
    }
  } catch (err: any) {
    debugLogs.push(`users/me exception: ${err.message}`);
  }

  // B. Also fetch directly from meetings/{meetingId}/recordings to ensure the latest instance is present
  try {
    const directRes = await fetch(
      `https://api.zoom.us/v2/meetings/${encodeURIComponent(zoomMeetingId)}/recordings`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      }
    );
    const directData = await directRes.json();
    debugLogs.push(`meetings/${zoomMeetingId} status=${directRes.status}`);
    if (directRes.ok && directData && directData.uuid) {
      const exists = meetingInstances.some((m) => m.uuid === directData.uuid);
      if (!exists) {
        meetingInstances.push(directData);
        debugLogs.push(`added direct meeting uuid=${directData.uuid}`);
      }
    } else if (!directRes.ok) {
      debugLogs.push(`meetings/${zoomMeetingId} error: ${JSON.stringify(directData)}`);
    }
  } catch (err: any) {
    debugLogs.push(`meetings/${zoomMeetingId} exception: ${err.message}`);
  }

  if (meetingInstances.length === 0) {
    return {
      success: true,
      count: 0,
      syncedDates: [],
      message: `No cloud recordings found in Zoom for Meeting ID ${zoomMeetingId}. Debug: ${debugLogs.join(' | ')}`,
    };
  }

  // 3. Load existing recordings for this cohort to merge
  const existingRecordings = await listRecordings(cohortId);
  const existingByDate = new Map<string, any>();
  existingRecordings.forEach((r) => {
    existingByDate.set(String(r.classDate).slice(0, 10), r);
  });

  // Calculate day mapping: sort instances chronologically
  const dateToFiles = new Map<
    string,
    {
      uuid: string;
      shareUrl?: string;
      password?: string;
      speakerPlayUrl?: string;
      galleryPlayUrl?: string;
      speakerDownloadUrl?: string;
      galleryDownloadUrl?: string;
    }
  >();

  for (const meeting of meetingInstances) {
    const files = meeting.recording_files || [];
    const shareUrl = meeting.share_url;
    const password = meeting.password || meeting.recording_play_passcode;

    for (const file of files) {
      if (!file.recording_start) continue;
      const isVideo = file.file_type === 'MP4' || file.file_extension === 'MP4';
      if (!isVideo) continue;

      const dateStr = file.recording_start.split('T')[0];
      const current = dateToFiles.get(dateStr) || { uuid: meeting.uuid, shareUrl, password };

      if (!current.shareUrl && shareUrl) current.shareUrl = shareUrl;
      if (!current.password && password) current.password = password;

      const recType = (file.recording_type || '').toLowerCase();
      if (SPEAKER_TYPES.has(recType) && !current.speakerPlayUrl) {
        current.speakerPlayUrl = file.play_url;
        current.speakerDownloadUrl = file.download_url;
      } else if (GALLERY_TYPES.has(recType) && !current.galleryPlayUrl) {
        current.galleryPlayUrl = file.play_url;
        current.galleryDownloadUrl = file.download_url;
      }

      dateToFiles.set(dateStr, current);
    }
  }

  const sortedDates = [...dateToFiles.keys()].sort();
  const syncedDates: string[] = [];

  for (let idx = 0; idx < sortedDates.length; idx++) {
    const dateStr = sortedDates[idx];
    const data = dateToFiles.get(dateStr)!;
    const existing = existingByDate.get(dateStr);

    // Calculate dayNumber:
    // If cohort has startDate, count elapsed calendar days + 1, or fallback to chronological idx + 1
    let dayNumber = existing?.dayNumber;
    if (!dayNumber) {
      if (cohort.startDate) {
        const start = new Date(String(cohort.startDate).slice(0, 10)).getTime();
        const cur = new Date(dateStr).getTime();
        const diffDays = Math.round((cur - start) / 86400000);
        dayNumber = diffDays >= 0 ? diffDays + 1 : idx + 1;
      } else {
        dayNumber = idx + 1;
      }
    }

    const metadata = {
      ...(existing?.metadata || {}),
      zoomSpeakerUrl: data.speakerPlayUrl || existing?.metadata?.zoomSpeakerUrl || null,
      zoomGalleryUrl: data.galleryPlayUrl || existing?.metadata?.zoomGalleryUrl || null,
      zoomShareUrl: data.shareUrl || existing?.metadata?.zoomShareUrl || null,
      zoomPassword: data.password || existing?.metadata?.zoomPassword || null,
      lastZoomSyncAt: new Date().toISOString(),
    };

    const updatePayload = {
      id: existing?._id,
      cohortId,
      classDate: dateStr,
      dayNumber,
      zoomMeetingId,
      zoomMeetingUuid: data.uuid,
      youtubeSpeakerId: existing?.youtubeSpeakerId || null,
      youtubeGalleryId: existing?.youtubeGalleryId || null,
      youtubeSpeakerUrl: existing?.youtubeSpeakerUrl || null,
      youtubeGalleryUrl: existing?.youtubeGalleryUrl || null,
      bunnySpeakerUrl: existing?.bunnySpeakerUrl || null,
      bunnyGalleryUrl: existing?.bunnyGalleryUrl || null,
      deliveredStudentIds: existing?.deliveredStudentIds || [],
      metadata,
    };

    await upsertRecording(updatePayload);
    syncedDates.push(dateStr);
  }

  return {
    success: true,
    count: syncedDates.length,
    syncedDates,
    message: `Synced ${syncedDates.length} recording date(s) from Zoom (${syncedDates.join(', ')})`,
  };
}

/**
 * Sync Zoom recordings for all active cohorts with zoomMeetingId configured
 */
export async function syncAllActiveCohortsRecordings(): Promise<
  Array<{ cohort: string; success: boolean; count?: number; message?: string; error?: string }>
> {
  const cohorts = await listCohorts();
  const results: Array<{ cohort: string; success: boolean; count?: number; message?: string; error?: string }> = [];

  for (const cohort of cohorts) {
    if (cohort.zoomMeetingId) {
      try {
        const res = await syncZoomRecordingsForCohort(cohort._id);
        results.push({
          cohort: cohort.name,
          success: res.success,
          count: res.count,
          message: res.message,
        });
      } catch (err: any) {
        console.error(`[Zoom Sync] Error for ${cohort.name}:`, err);
        results.push({
          cohort: cohort.name,
          success: false,
          error: err.stack || err.message,
        });
      }
    }
  }

  return results;
}
