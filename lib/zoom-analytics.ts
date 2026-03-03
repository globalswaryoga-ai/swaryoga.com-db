/**
 * Zoom Meeting Analytics Service
 * Fetches participant data, calculates attendance grades, and generates reports.
 * Uses Zoom Report API (Server-to-Server OAuth).
 */

import { getZoomAccessToken } from './zoom-s3-sync';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ZoomMeetingInstance {
  uuid: string;
  start_time: string;
  end_time?: string;
  duration: number; // minutes
  topic: string;
}

export interface ZoomParticipant {
  id: string;
  user_id: string;
  name: string;
  user_email: string;
  join_time: string;
  leave_time: string;
  duration: number; // seconds
  camera?: string; // 'on' | 'off' | ''
  microphone?: string;
  device?: string;
  ip_address?: string;
  location?: string;
  network_type?: string;
  status?: string; // 'in_meeting' | 'in_waiting_room'
  registrant_id?: string;
}

export interface ParticipantAnalysis {
  name: string;
  email: string;
  joinTime: string;
  leaveTime: string;
  durationSeconds: number;
  durationFormatted: string;
  attendancePercent: number;
  videoOn: boolean;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  gradeLabel: string;
  sessionsAttended: number;
  totalSessions: number;
  device?: string;
  location?: string;
}

export interface MeetingAnalytics {
  meetingId: string;
  topic: string;
  totalSessions: number;
  sessionDates: string[];
  totalUniqueParticipants: number;
  avgAttendance: number;
  participants: ParticipantAnalysis[];
  gradeDistribution: Record<string, number>;
  sessions: SessionDetail[];
}

export interface SessionDetail {
  uuid: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  participantCount: number;
  participants: SessionParticipant[];
}

export interface SessionParticipant {
  name: string;
  email: string;
  joinTime: string;
  leaveTime: string;
  durationSeconds: number;
  durationFormatted: string;
  attendancePercent: number;
  videoOn: boolean;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  gradeLabel: string;
}

// ─── Grading ─────────────────────────────────────────────────────────────────

export function calculateGrade(
  attendancePercent: number,
  videoOn: boolean
): { grade: 'A' | 'B' | 'C' | 'D' | 'E'; label: string } {
  // A: ≥90% attendance + video on
  if (attendancePercent >= 90 && videoOn) {
    return { grade: 'A', label: 'Excellent – Full attendance & video on' };
  }
  // B: ≥70% attendance (or ≥90% without video)
  if (attendancePercent >= 70) {
    return { grade: 'B', label: 'Good – Strong attendance' };
  }
  // C: ≥50% attendance
  if (attendancePercent >= 50) {
    return { grade: 'C', label: 'Average – Partial attendance' };
  }
  // D: ≥30% attendance
  if (attendancePercent >= 30) {
    return { grade: 'D', label: 'Below average – Low attendance' };
  }
  // E: <30%
  return { grade: 'E', label: 'Poor – Minimal attendance' };
}

export const GRADE_COLORS: Record<string, string> = {
  A: '#10B981', // green
  B: '#3B82F6', // blue
  C: '#F59E0B', // amber
  D: '#F97316', // orange
  E: '#EF4444', // red
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function doubleEncodeUUID(uuid: string): string {
  // Zoom API requires double-encoded UUIDs when they contain / or //
  if (uuid.includes('/') || uuid.includes('//')) {
    return encodeURIComponent(encodeURIComponent(uuid));
  }
  return uuid;
}

// ─── Zoom API Calls ──────────────────────────────────────────────────────────

/**
 * Get past meeting instances (for recurring meetings).
 * This tells us how many days/sessions the meeting ID was used.
 */
export async function getMeetingInstances(meetingId: string): Promise<ZoomMeetingInstance[]> {
  const accessToken = await getZoomAccessToken();
  console.log(`[Zoom Analytics] Calling GET /v2/past_meetings/${meetingId}/instances`);

  const response = await fetch(
    `https://api.zoom.us/v2/past_meetings/${meetingId}/instances`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`[Zoom Analytics] past_meetings/${meetingId}/instances returned ${response.status}: ${errorText}`);
    // If 404, meeting may not have ended yet or no instances
    if (response.status === 404) return [];
    throw new Error(`Failed to get meeting instances: ${response.status} – ${errorText}`);
  }

  const data = await response.json();
  console.log(`[Zoom Analytics] past_meetings instances response:`, JSON.stringify(data).slice(0, 500));
  return data.meetings || [];
}

/**
 * Get participants for a specific meeting instance (by UUID).
 * Uses Zoom Dashboard/Reports API.
 */
export async function getMeetingParticipants(
  meetingUUIDOrId: string,
  pageSize: number = 300
): Promise<ZoomParticipant[]> {
  const accessToken = await getZoomAccessToken();
  const encoded = doubleEncodeUUID(meetingUUIDOrId);

  const allParticipants: ZoomParticipant[] = [];
  let nextPageToken = '';

  do {
    const url = new URL(`https://api.zoom.us/v2/report/meetings/${encoded}/participants`);
    url.searchParams.set('page_size', String(pageSize));
    if (nextPageToken) url.searchParams.set('next_page_token', nextPageToken);

    console.log(`[Zoom Analytics] Calling GET ${url.pathname}${url.search}`);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Zoom Analytics] participants API returned ${response.status}: ${error}`);
      throw new Error(`Failed to get participants: ${response.status} – ${error}`);
    }

    const data = await response.json();
    console.log(`[Zoom Analytics] Participants response: total_records=${data.total_records}, page_count=${data.page_count}, returned=${(data.participants || []).length}`);
    allParticipants.push(...(data.participants || []));
    nextPageToken = data.next_page_token || '';
  } while (nextPageToken);

  return allParticipants;
}

/**
 * Get meeting report/details for a past meeting.
 */
export async function getMeetingReport(meetingUUIDOrId: string): Promise<any> {
  const accessToken = await getZoomAccessToken();
  const encoded = doubleEncodeUUID(meetingUUIDOrId);

  const response = await fetch(
    `https://api.zoom.us/v2/report/meetings/${encoded}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get meeting report: ${response.status} – ${error}`);
  }

  return response.json();
}

// ─── Full Analytics ──────────────────────────────────────────────────────────

/**
 * Get complete analytics for a meeting ID:
 * - All sessions/instances
 * - Participants per session with in/out times
 * - Attendance % and grades
 * - Grade distribution
 */
export async function getFullMeetingAnalytics(rawMeetingId: string): Promise<MeetingAnalytics> {
  // Strip spaces, dashes, and non-numeric characters from meeting ID
  const meetingId = rawMeetingId.replace(/[\s\-]/g, '');
  console.log(`[Zoom Analytics] Fetching analytics for meeting ID: ${meetingId}`);
  
  // 1) Get all instances of this meeting
  let instances = await getMeetingInstances(meetingId);
  console.log(`[Zoom Analytics] Found ${instances.length} instances via past_meetings endpoint`);

  // If no instances found, try fetching directly as a single meeting
  if (instances.length === 0) {
    console.log(`[Zoom Analytics] No instances found, trying direct report fetch...`);
    try {
      const report = await getMeetingReport(meetingId);
      console.log(`[Zoom Analytics] Direct report fetch result:`, JSON.stringify({
        uuid: report.uuid, topic: report.topic, start_time: report.start_time,
        end_time: report.end_time, duration: report.duration, participants_count: report.participants_count,
      }));
      instances = [{
        uuid: report.uuid || meetingId,
        start_time: report.start_time,
        end_time: report.end_time,
        duration: report.duration || 0,
        topic: report.topic || 'Unknown Meeting',
      }];
    } catch (reportErr: any) {
      console.error(`[Zoom Analytics] Direct report also failed:`, reportErr.message);
      throw new Error(
        `Meeting ${meetingId} not found or has no data yet. ` +
        `Note: Zoom Reports API requires meetings to have ended at least 2 hours ago. ` +
        `If this is a scheduled/upcoming meeting, data will not be available until after it ends. ` +
        `Error: ${reportErr.message}`
      );
    }
  }

  // Sort instances by start time
  instances.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const topic = instances[0]?.topic || 'Unknown Meeting';
  const totalSessions = instances.length;
  const sessionDates = instances.map(i => new Date(i.start_time).toISOString().split('T')[0]);

  // 2) Fetch participants for each session
  const sessions: SessionDetail[] = [];
  const participantMap: Map<string, {
    name: string;
    email: string;
    totalDuration: number;
    totalMeetingDuration: number;
    videoOnCount: number;
    sessionsAttended: number;
    device?: string;
    location?: string;
    firstJoin: string;
    lastLeave: string;
  }> = new Map();

  for (const instance of instances) {
    try {
      const participants = await getMeetingParticipants(instance.uuid);

      const meetingDurationSeconds = (instance.duration || 60) * 60; // convert mins to secs
      const sessionStart = instance.start_time;
      const sessionEnd = instance.end_time || new Date(
        new Date(sessionStart).getTime() + meetingDurationSeconds * 1000
      ).toISOString();

      const sessionParticipants: SessionParticipant[] = participants.map(p => {
        const attendancePercent = meetingDurationSeconds > 0
          ? Math.min(100, Math.round((p.duration / meetingDurationSeconds) * 100))
          : 0;
        const videoOn = p.camera === 'on' || p.camera === 'true';
        const { grade, label } = calculateGrade(attendancePercent, videoOn);

        return {
          name: p.name || 'Unknown',
          email: p.user_email || '',
          joinTime: p.join_time,
          leaveTime: p.leave_time,
          durationSeconds: p.duration,
          durationFormatted: formatDuration(p.duration),
          attendancePercent,
          videoOn,
          grade,
          gradeLabel: label,
        };
      });

      sessions.push({
        uuid: instance.uuid,
        date: new Date(sessionStart).toISOString().split('T')[0],
        startTime: sessionStart,
        endTime: sessionEnd,
        duration: instance.duration,
        participantCount: participants.length,
        participants: sessionParticipants,
      });

      // Aggregate per-participant across sessions (keyed by email or name)
      for (const p of participants) {
        const key = (p.user_email || p.name || 'unknown').toLowerCase().trim();
        const existing = participantMap.get(key);
        const videoOn = p.camera === 'on' || p.camera === 'true';

        if (existing) {
          existing.totalDuration += p.duration;
          existing.totalMeetingDuration += meetingDurationSeconds;
          existing.sessionsAttended += 1;
          if (videoOn) existing.videoOnCount += 1;
          if (new Date(p.leave_time) > new Date(existing.lastLeave)) {
            existing.lastLeave = p.leave_time;
          }
        } else {
          participantMap.set(key, {
            name: p.name || 'Unknown',
            email: p.user_email || '',
            totalDuration: p.duration,
            totalMeetingDuration: meetingDurationSeconds,
            videoOnCount: videoOn ? 1 : 0,
            sessionsAttended: 1,
            device: p.device,
            location: p.location,
            firstJoin: p.join_time,
            lastLeave: p.leave_time,
          });
        }
      }
    } catch (err: any) {
      console.warn(`[Zoom Analytics] ⚠️ Failed to fetch participants for instance ${instance.uuid}:`, err.message);
      // Still add the session with 0 participants so it shows up
      sessions.push({
        uuid: instance.uuid,
        date: new Date(instance.start_time).toISOString().split('T')[0],
        startTime: instance.start_time,
        endTime: instance.end_time || instance.start_time,
        duration: instance.duration,
        participantCount: 0,
        participants: [],
      });
    }
  }

  // 3) Build final participant analysis with overall grades
  const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  const participants: ParticipantAnalysis[] = Array.from(participantMap.values())
    .map(p => {
      const attendancePercent = p.totalMeetingDuration > 0
        ? Math.min(100, Math.round((p.totalDuration / p.totalMeetingDuration) * 100))
        : 0;
      const videoOn = p.videoOnCount > (p.sessionsAttended / 2); // majority sessions with video
      const { grade, label } = calculateGrade(attendancePercent, videoOn);

      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;

      return {
        name: p.name,
        email: p.email,
        joinTime: p.firstJoin,
        leaveTime: p.lastLeave,
        durationSeconds: p.totalDuration,
        durationFormatted: formatDuration(p.totalDuration),
        attendancePercent,
        videoOn,
        grade,
        gradeLabel: label,
        sessionsAttended: p.sessionsAttended,
        totalSessions,
        device: p.device,
        location: p.location,
      };
    })
    .sort((a, b) => {
      // Sort by grade (A first), then by attendance
      const gradeOrder = { A: 0, B: 1, C: 2, D: 3, E: 4 };
      if (gradeOrder[a.grade] !== gradeOrder[b.grade]) {
        return gradeOrder[a.grade] - gradeOrder[b.grade];
      }
      return b.attendancePercent - a.attendancePercent;
    });

  const totalUniqueParticipants = participants.length;
  const avgAttendance = totalUniqueParticipants > 0
    ? Math.round(participants.reduce((sum, p) => sum + p.attendancePercent, 0) / totalUniqueParticipants)
    : 0;

  return {
    meetingId,
    topic,
    totalSessions,
    sessionDates,
    totalUniqueParticipants,
    avgAttendance,
    participants,
    gradeDistribution,
    sessions,
  };
}
