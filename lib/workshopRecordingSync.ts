import { getCohort, listCohorts, listRecordings, upsertRecording } from '@/lib/workshopBunnyRepository';
import { getZoomAccessToken } from '@/lib/zoomAccessToken';
import { workshopSessionCalendar } from '@/lib/workshopSessionUtils';

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

  const zoomMeetingIdRaw = cohort.zoomMeetingId ? String(cohort.zoomMeetingId).trim() : '';
  const zoomMeetingId = zoomMeetingIdRaw.replace(/\D+/g, '');
  if (!zoomMeetingId) {
    return {
      success: false,
      count: 0,
      syncedDates: [],
      message: 'No Zoom Meeting ID is configured for this workshop.',
    };
  }

  const accessToken = await getZoomAccessToken();
  const debugLogs: string[] = [];

  const startDate = cohort.startDate ? String(cohort.startDate).slice(0, 10) : '2026-08-01';
  // Zoom 'to' parameter is exclusive in UTC, so query through tomorrow
  const today = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const fromDate = startDate && startDate > thirtyDaysAgo ? startDate : thirtyDaysAgo;

  const meetingInstances: ZoomMeetingRecord[] = [];

  // A. Fetch from past_meetings/{meetingId}/instances
  try {
    const instancesRes = await fetch(
      `https://api.zoom.us/v2/past_meetings/${encodeURIComponent(zoomMeetingId)}/instances`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      }
    );
    const instancesData = await instancesRes.json();
    debugLogs.push(`instances status=${instancesRes.status}`);
    
    if (instancesRes.ok && instancesData && instancesData.meetings) {
      for (const instance of instancesData.meetings) {
        if (!instance.uuid) continue;
        let uuid = instance.uuid;
        // Zoom requires double URL encoding for UUIDs that start with / or contain //
        if (uuid.startsWith('/') || uuid.includes('//')) {
          uuid = encodeURIComponent(encodeURIComponent(uuid));
        } else {
          uuid = encodeURIComponent(uuid);
        }
        try {
          const recRes = await fetch(`https://api.zoom.us/v2/meetings/${uuid}/recordings`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          });
          if (recRes.ok) {
            const recData = await recRes.json();
            if (recData && recData.uuid && !meetingInstances.some((m) => m.uuid === recData.uuid)) {
              meetingInstances.push(recData);
            }
          }
        } catch (e) {
          // ignore individual fetch errors
        }
      }
      debugLogs.push(`instances fetched=${meetingInstances.length}`);
    }
  } catch (err: any) {
    debugLogs.push(`instances exception: ${err.message}`);
  }

  // B. Fetch from users/me/recordings just in case (fallback)
  try {
    const listRes = await fetch(
      `https://api.zoom.us/v2/users/me/recordings?from=${fromDate}&to=${today}&page_size=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      }
    );
    const listData = await listRes.json();
    if (listRes.ok) {
      const matched = (listData.meetings || []).filter(
        (m: any) => String(m.id).trim() === zoomMeetingId
      );
      for (const match of matched) {
        if (!meetingInstances.some((m) => m.uuid === match.uuid)) {
          meetingInstances.push(match);
        }
      }
    }
  } catch (err: any) {
    debugLogs.push(`users/me exception: ${err.message}`);
  }

  // C. Also fetch directly from meetings/{meetingId}/recordings to ensure the latest instance is present
  try {
    const directRes = await fetch(
      `https://api.zoom.us/v2/meetings/${encodeURIComponent(zoomMeetingId)}/recordings`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      }
    );
    const directData = await directRes.json();
    if (directRes.ok && directData && directData.uuid) {
      if (!meetingInstances.some((m) => m.uuid === directData.uuid)) {
        meetingInstances.push(directData);
      }
    } else if (!directRes.ok) {
      debugLogs.push(`meetings/${zoomMeetingId} error: ${JSON.stringify(directData)}`);
    }
  } catch (err: any) {
    debugLogs.push(`meetings/${zoomMeetingId} exception: ${err.message}`);
  }

  // D. Trash recovery has been removed based on user request (do not fetch deleted videos)

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

      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: cohort.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(file.recording_start));
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

  // Load uploaded meetings from social_media_accounts_sql to automatically populate YouTube & Bunny URLs
  const uploadedMap = new Map<string, any>();
  try {
    const { bunnyExecute } = await import('@/lib/bunnyDatabase');
    const sm = await bunnyExecute("SELECT data_json FROM social_media_accounts_sql WHERE platform = 'youtube' AND is_connected = 1 LIMIT 1");
    if (sm.rows[0]) {
      const parsed = JSON.parse(String((sm.rows[0] as any).data_json || '{}'));
      const list = parsed.metadata?.uploadedMeetings || parsed.uploadedMeetings || [];
      for (const item of list) {
        if (item.uuid) uploadedMap.set(String(item.uuid), item);
        const itemMeetingDigits = String(item.zoomMeetingId || '').replace(/\D+/g, '');
        if (itemMeetingDigits && item.startTime) {
          const d = new Intl.DateTimeFormat('en-CA', { timeZone: cohort.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(item.startTime));
          uploadedMap.set(`${itemMeetingDigits}:${d}`, item);
          // If this uploaded meeting matches this cohort's meeting ID, ensure it is included in dateToFiles
          if (itemMeetingDigits === zoomMeetingId && !dateToFiles.has(d)) {
            dateToFiles.set(d, { uuid: String(item.uuid || '') });
          }
        }
      }
    }
  } catch {}

  // Also include any dates from existing recordings that might need uploaded URLs linked
  for (const [d, rec] of existingByDate.entries()) {
    if (!dateToFiles.has(d)) {
      dateToFiles.set(d, {
        uuid: rec.zoomMeetingUuid || '',
        speakerPlayUrl: rec.metadata?.zoomSpeakerUrl || undefined,
        galleryPlayUrl: rec.metadata?.zoomGalleryUrl || undefined,
        shareUrl: rec.metadata?.zoomShareUrl || undefined,
        password: rec.metadata?.zoomPassword || undefined,
      });
    }
  }

  if (dateToFiles.size === 0) {
    return {
      success: true,
      count: 0,
      syncedDates: [],
      message: `No cloud recordings or uploaded videos found for Meeting ID ${zoomMeetingId}. Debug: ${debugLogs.join(' | ')}`,
    };
  }

  const bunnyCdn = (p?: string) => p ? (p.startsWith('http') ? p : 'https://swaryogacrm.b-cdn.net/' + p.replace(/^\/+/, '')) : null;

  const scheduledDays = new Map(workshopSessionCalendar(startDate, cohort.holidayDates || []).filter(day => !day.holiday).map(day => [day.classDate, day.dayNumber]));
  // Keep all recording dates, not just strict 14-day calendar
  const sortedDates = [...dateToFiles.keys()].sort();
  const syncedDates: string[] = [];

  for (let idx = 0; idx < sortedDates.length; idx++) {
    const dateStr = sortedDates[idx];
    const data = dateToFiles.get(dateStr)!;
    const existing = existingByDate.get(dateStr);
    const uploaded = uploadedMap.get(data.uuid) || uploadedMap.get(`${zoomMeetingId}:${dateStr}`);

    // Calculate dayNumber:
    // 1. Explicit date-day mapping
    // 2. Scheduled calendar day
    // 3. Existing day number
    // 4. Fallback based on elapsed calendar days from startDate or chronological idx + 1
    const elapsedDays = Math.max(1, Math.floor((new Date(dateStr).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
    const dayNumber = cohort.metadata?.dateDayMap?.[dateStr] || scheduledDays.get(dateStr) || existing?.dayNumber || elapsedDays || (idx + 1);

    const metadata = {
      ...(existing?.metadata || {}),
      zoomSpeakerUrl: data.speakerPlayUrl || existing?.metadata?.zoomSpeakerUrl || null,
      zoomGalleryUrl: data.galleryPlayUrl || existing?.metadata?.zoomGalleryUrl || null,
      zoomShareUrl: data.shareUrl || existing?.metadata?.zoomShareUrl || null,
      zoomPassword: data.password || existing?.metadata?.zoomPassword || null,
      bunnyAudioUrl: existing?.metadata?.bunnyAudioUrl || (uploaded?.bunny?.audio ? bunnyCdn(uploaded.bunny.audio) : null),
      lastZoomSyncAt: new Date().toISOString(),
    };

    const ytSpeakerUrl = existing?.youtubeSpeakerUrl || uploaded?.youtubeUrls?.speaker || (uploaded?.youtube?.speaker ? `https://youtu.be/${uploaded.youtube.speaker}` : null);
    const ytGalleryUrl = existing?.youtubeGalleryUrl || uploaded?.youtubeUrls?.gallery || (uploaded?.youtube?.gallery ? `https://youtu.be/${uploaded.youtube.gallery}` : null);
    const ytSpeakerId = existing?.youtubeSpeakerId || uploaded?.youtube?.speaker || null;
    const ytGalleryId = existing?.youtubeGalleryId || uploaded?.youtube?.gallery || null;
    const bunnySpeakerUrl = existing?.bunnySpeakerUrl || (uploaded?.bunny?.speaker ? bunnyCdn(uploaded.bunny.speaker) : null);
    const bunnyGalleryUrl = existing?.bunnyGalleryUrl || (uploaded?.bunny?.gallery ? bunnyCdn(uploaded.bunny.gallery) : null);

    const updatePayload = {
      id: existing?._id,
      cohortId,
      classDate: dateStr,
      dayNumber,
      zoomMeetingId,
      zoomMeetingUuid: data.uuid,
      youtubeSpeakerId: ytSpeakerId,
      youtubeGalleryId: ytGalleryId,
      youtubeSpeakerUrl: ytSpeakerUrl,
      youtubeGalleryUrl: ytGalleryUrl,
      bunnySpeakerUrl: bunnySpeakerUrl,
      bunnyGalleryUrl: bunnyGalleryUrl,
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
