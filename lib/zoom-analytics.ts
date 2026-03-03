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
  _errors?: string[];
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
  _videoOn?: boolean  // kept for API compat but not used for grading (Report API doesn't provide camera data)
): { grade: 'A' | 'B' | 'C' | 'D' | 'E'; label: string } {
  // A: ≥90% attendance
  if (attendancePercent >= 90) {
    return { grade: 'A', label: 'Excellent – Full attendance' };
  }
  // B: ≥70% attendance
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
  // Zoom API requires double-encoded UUIDs when they start with / or contain //
  // Also encode when they contain special URL chars like + or =
  if (uuid.startsWith('/') || uuid.includes('//') || uuid.includes('+') || uuid.includes('=')) {
    return encodeURIComponent(encodeURIComponent(uuid));
  }
  return encodeURIComponent(uuid);
}

// ─── Zoom API Calls ──────────────────────────────────────────────────────────

/**
 * Get past meeting instances (for recurring meetings).
 * This tells us how many days/sessions the meeting ID was used.
 */
export async function getMeetingInstances(meetingId: string, accessToken?: string): Promise<ZoomMeetingInstance[]> {
  const token = accessToken || await getZoomAccessToken();
  console.log(`[Zoom Analytics] Calling GET /v2/past_meetings/${meetingId}/instances`);

  const response = await fetch(
    `https://api.zoom.us/v2/past_meetings/${meetingId}/instances`,
    {
      headers: { Authorization: `Bearer ${token}` },
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
  pageSize: number = 300,
  accessToken?: string
): Promise<ZoomParticipant[]> {
  const token = accessToken || await getZoomAccessToken();
  const encoded = doubleEncodeUUID(meetingUUIDOrId);

  const allParticipants: ZoomParticipant[] = [];
  let nextPageToken = '';

  do {
    // Build URL manually to avoid new URL() decoding the double-encoded UUID
    let urlStr = `https://api.zoom.us/v2/report/meetings/${encoded}/participants?page_size=${pageSize}`;
    if (nextPageToken) urlStr += `&next_page_token=${encodeURIComponent(nextPageToken)}`;

    console.log(`[Zoom Analytics] Calling GET /v2/report/meetings/${encoded.slice(0, 20)}...`);
    const response = await fetch(urlStr, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Zoom Analytics] participants API returned ${response.status}: ${error}`);
      // Check for scope-related errors
      if (error.includes('does not contain scopes')) {
        throw new Error(
          `Missing Zoom Report API scope. Please add "report:read:list_meeting_participants:admin" ` +
          `and "report:read:meeting:admin" scopes to your Zoom Server-to-Server OAuth app. ` +
          `Go to marketplace.zoom.us → Your Apps → Scopes → Report category.`
        );
      }
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
export async function getMeetingReport(meetingUUIDOrId: string, accessToken?: string): Promise<any> {
  const token = accessToken || await getZoomAccessToken();
  const encoded = doubleEncodeUUID(meetingUUIDOrId);

  const response = await fetch(
    `https://api.zoom.us/v2/report/meetings/${encoded}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Zoom Analytics] report API returned ${response.status}: ${error}`);
    if (error.includes('does not contain scopes')) {
      throw new Error(
        `Missing Zoom Report API scope. Please add "report:read:meeting:admin" ` +
        `scope to your Zoom Server-to-Server OAuth app at marketplace.zoom.us.`
      );
    }
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
export async function getFullMeetingAnalytics(
  rawMeetingId: string,
  fromDate?: string,
  toDate?: string,
): Promise<MeetingAnalytics> {
  // Strip spaces, dashes, and non-numeric characters from meeting ID
  const meetingId = rawMeetingId.replace(/[\s\-]/g, '');
  console.log(`[Zoom Analytics] Fetching analytics for meeting ID: ${meetingId}, from=${fromDate}, to=${toDate}`);
  
  // Get ONE access token upfront and reuse it for all API calls
  // (Zoom invalidates previous tokens when new ones are issued)
  const accessToken = await getZoomAccessToken();
  console.log(`[Zoom Analytics] Got access token, will reuse for all API calls`);
  
  // 1) Get all instances of this meeting
  let instances = await getMeetingInstances(meetingId, accessToken);
  console.log(`[Zoom Analytics] Found ${instances.length} instances via past_meetings endpoint`);

  // If no instances found, try fetching directly as a single meeting
  if (instances.length === 0) {
    console.log(`[Zoom Analytics] No instances found, trying direct report fetch...`);
    try {
      const report = await getMeetingReport(meetingId, accessToken);
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

  // Apply date range filter if provided
  if (fromDate || toDate) {
    const from = fromDate ? new Date(fromDate + 'T00:00:00Z').getTime() : 0;
    const to = toDate ? new Date(toDate + 'T23:59:59Z').getTime() : Infinity;
    const beforeFilter = instances.length;
    instances = instances.filter(i => {
      const t = new Date(i.start_time).getTime();
      return t >= from && t <= to;
    });
    console.log(`[Zoom Analytics] Date filter: ${beforeFilter} → ${instances.length} instances (from=${fromDate}, to=${toDate})`);
  }

  if (instances.length === 0) {
    throw new Error(
      fromDate || toDate
        ? `No sessions found for meeting ${meetingId} in the selected date range (${fromDate || 'start'} to ${toDate || 'now'}).`
        : `Meeting ${meetingId} has no recorded sessions.`
    );
  }

  // Get topic from first instance or from a report call
  let topic = 'Unknown Meeting';
  try {
    const report = await getMeetingReport(instances[instances.length - 1].uuid, accessToken);
    topic = report.topic || topic;
    // Also update duration if available
    for (const inst of instances) {
      if (!inst.duration && inst.uuid === report.uuid) {
        inst.duration = report.duration;
        inst.end_time = report.end_time;
      }
    }
  } catch {
    // fallback to instance topic
    topic = instances[0]?.topic || topic;
  }

  const totalSessions = instances.length;
  const sessionDates = instances.map(i => new Date(i.start_time).toISOString().split('T')[0]);

  // 2) Fetch participants for each session
  const sessions: SessionDetail[] = [];
  const sessionErrors: string[] = [];
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
      // Get the meeting report for this instance to get actual duration
      let meetingDurationMinutes = instance.duration || 0;
      if (!meetingDurationMinutes) {
        try {
          const instanceReport = await getMeetingReport(instance.uuid, accessToken);
          meetingDurationMinutes = instanceReport.duration || 60;
          instance.duration = meetingDurationMinutes;
          instance.end_time = instance.end_time || instanceReport.end_time;
          if (!instance.topic && instanceReport.topic) instance.topic = instanceReport.topic;
        } catch {
          meetingDurationMinutes = 60; // fallback to 60 min
        }
      }
      
      const participants = await getMeetingParticipants(instance.uuid, 300, accessToken);

      const meetingDurationSeconds = meetingDurationMinutes * 60; // convert mins to secs
      const sessionStart = instance.start_time;
      const sessionEnd = instance.end_time || new Date(
        new Date(sessionStart).getTime() + meetingDurationSeconds * 1000
      ).toISOString();

      const sessionParticipants: SessionParticipant[] = participants.map(p => {
        const attendancePercent = meetingDurationSeconds > 0
          ? Math.min(100, Math.round((p.duration / meetingDurationSeconds) * 100))
          : 0;
        const { grade, label } = calculateGrade(attendancePercent);

        return {
          name: p.name || 'Unknown',
          email: p.user_email || '',
          joinTime: p.join_time,
          leaveTime: p.leave_time,
          durationSeconds: p.duration,
          durationFormatted: formatDuration(p.duration),
          attendancePercent,
          videoOn: false, // Report API does not provide camera data
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

        if (existing) {
          existing.totalDuration += p.duration;
          existing.totalMeetingDuration += meetingDurationSeconds;
          existing.sessionsAttended += 1;
          if (new Date(p.leave_time) > new Date(existing.lastLeave)) {
            existing.lastLeave = p.leave_time;
          }
        } else {
          participantMap.set(key, {
            name: p.name || 'Unknown',
            email: p.user_email || '',
            totalDuration: p.duration,
            totalMeetingDuration: meetingDurationSeconds,
            videoOnCount: 0,
            sessionsAttended: 1,
            device: p.device,
            location: p.location,
            firstJoin: p.join_time,
            lastLeave: p.leave_time,
          });
        }
      }
    } catch (err: any) {
      const errMsg = `Session ${instance.uuid.slice(0, 10)}… (${new Date(instance.start_time).toISOString().split('T')[0]}): ${err.message}`;
      console.warn(`[Zoom Analytics] ⚠️ ${errMsg}`);
      sessionErrors.push(errMsg);
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
      const { grade, label } = calculateGrade(attendancePercent);

      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;

      return {
        name: p.name,
        email: p.email,
        joinTime: p.firstJoin,
        leaveTime: p.lastLeave,
        durationSeconds: p.totalDuration,
        durationFormatted: formatDuration(p.totalDuration),
        attendancePercent,
        videoOn: false,
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
    _errors: sessionErrors.length > 0 ? sessionErrors : undefined,
  };
}
