import { getFullMeetingAnalytics, type SessionParticipant } from './zoom-analytics';
import { getWorkshopAttendance, getWorkshopCohort, getWorkshopStudent } from './schemas/workshopStudentManagementSchemas';

type SyncResult = {
  cohortId: string;
  cohortName: string;
  sessions: number;
  matched: number;
  unmatched: number;
  updated: number;
  skipped: boolean;
  message?: string;
};

// Keep Unicode letters too: workshop and Zoom display names may be Marathi/Hindi.
const normalise = (value: unknown) => String(value || '').trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const phoneKey = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
};
const identityTokens = (value: unknown) => String(value || '')
  .toLocaleLowerCase()
  .split(/[^\p{L}\p{N}]+/u)
  .filter((token) => token.length >= 4 && !['gmail', 'yahoo', 'email', 'zoom', 'com', 'org'].includes(token));
const dayKey = (value: string | Date) => new Date(value).toISOString().slice(0, 10);

/**
 * Imports Zoom's completed-meeting report into the workshop attendance table.
 * Zoom publishes report participants only after the meeting has ended (often
 * with a delay of up to two hours), so this is designed to be safely retried.
 */
export async function syncWorkshopZoomAttendance(cohortId: string, classDate?: string): Promise<SyncResult> {
  const Cohort = getWorkshopCohort();
  const Student = getWorkshopStudent();
  const Attendance = getWorkshopAttendance();
  const cohort: any = await Cohort.findById(cohortId).lean();

  if (!cohort) throw new Error('Workshop not found');
  if (!cohort.zoomMeetingId) throw new Error('This workshop does not have a Zoom meeting ID');

  const students: any[] = await Student.find({ cohortId, active: true }).lean();
  if (!students.length) {
    return { cohortId, cohortName: cohort.name, sessions: 0, matched: 0, unmatched: 0, updated: 0, skipped: true, message: 'No active students to match.' };
  }

  const from = classDate || dayKey(cohort.startDate);
  const to = classDate || dayKey(new Date());
  const analytics = await getFullMeetingAnalytics(String(cohort.zoomMeetingId), from, to);
  const sessions = analytics.sessions.filter((session) => !classDate || session.date === classDate);
  if (!sessions.length) {
    return { cohortId, cohortName: cohort.name, sessions: 0, matched: 0, unmatched: 0, updated: 0, skipped: true, message: 'Zoom has not published a completed meeting report for this date yet.' };
  }

  const byEmail = new Map(students.filter((s) => normalise(s.email)).map((s) => [normalise(s.email), s]));
  const byName = new Map(students.filter((s) => normalise(s.name)).map((s) => [normalise(s.name), s]));
  const byPhone = new Map(students.flatMap((s) => {
    const keys = [...new Set([phoneKey(s.phone), phoneKey(s.whatsappNumber), phoneKey(s.name)].filter(Boolean))];
    return keys.map((key) => [key, s] as const);
  }));
  const findStudent = (participant: SessionParticipant) => {
    const participantEmail = normalise(participant.email);
    const participantName = normalise(participant.name);
    const participantPhone = phoneKey(participant.name) || phoneKey(participant.email);
    const exact =
      (participantEmail ? byEmail.get(participantEmail) : undefined) ||
      (participantName ? byName.get(participantName) : undefined) ||
      (participantPhone ? byPhone.get(participantPhone) : undefined);
    if (exact) return exact;

    // Zoom attendees sometimes enter a shortened version of their registered
    // name. Accept that only when it identifies exactly one enrolled student.
    const participantTokens = new Set([...identityTokens(participant.name), ...identityTokens(participant.email)]);
    if (!participantTokens.size) return undefined;
    const candidates = students.filter((student) => {
      const studentTokens = [...identityTokens(student.name), ...identityTokens(student.email)];
      return studentTokens.some((token) => participantTokens.has(token));
    });
    return candidates.length === 1 ? candidates[0] : undefined;
  };
  let matched = 0;
  let unmatched = 0;
  let updated = 0;

  for (const session of sessions) {
    const attendees = new Map<string, { student: any; duration: number; joinedAt?: string; leftAt?: string }>();
    for (const participant of session.participants as SessionParticipant[]) {
      const student = findStudent(participant);
      if (!student) { unmatched++; continue; }
      const key = String(student._id);
      const current = attendees.get(key);
      attendees.set(key, {
        student,
        duration: (current?.duration || 0) + Math.max(0, Number(participant.durationSeconds || 0)),
        joinedAt: !current?.joinedAt || new Date(participant.joinTime) < new Date(current.joinedAt) ? participant.joinTime : current.joinedAt,
        leftAt: !current?.leftAt || new Date(participant.leaveTime) > new Date(current.leftAt) ? participant.leaveTime : current.leftAt,
      });
    }

    for (const attendee of attendees.values()) {
      const classDurationSeconds = Math.max(1, Number(session.duration || 60) * 60);
      await Attendance.findOneAndUpdate(
        { cohortId: cohort._id, studentId: attendee.student._id, classDate: new Date(`${session.date}T00:00:00.000Z`) },
        { $set: {
          cohortId: cohort._id,
          studentId: attendee.student._id,
          classDate: new Date(`${session.date}T00:00:00.000Z`),
          joined: attendee.duration > 0,
          joinedAt: attendee.joinedAt ? new Date(attendee.joinedAt) : undefined,
          leftAt: attendee.leftAt ? new Date(attendee.leftAt) : undefined,
          durationSeconds: attendee.duration,
          attendancePercent: Math.min(100, Math.round(attendee.duration / classDurationSeconds * 100)),
          source: 'zoom',
        } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      matched++;
      updated++;
    }
  }

  await Cohort.findByIdAndUpdate(cohort._id, { $set: { zoomAttendanceLastSyncAt: new Date() } });
  return { cohortId: String(cohort._id), cohortName: cohort.name, sessions: sessions.length, matched, unmatched, updated, skipped: false };
}

export async function syncDueWorkshopZoomAttendance() {
  const Cohort = getWorkshopCohort();
  const cohorts: any[] = await Cohort.find({ zoomMeetingId: { $exists: true, $ne: '' }, autoSyncZoomAttendance: { $ne: false } }).lean();
  const results: SyncResult[] = [];
  for (const cohort of cohorts) {
    try {
      results.push(await syncWorkshopZoomAttendance(String(cohort._id)));
    } catch (error) {
      results.push({ cohortId: String(cohort._id), cohortName: cohort.name, sessions: 0, matched: 0, unmatched: 0, updated: 0, skipped: true, message: error instanceof Error ? error.message : 'Zoom sync failed' });
    }
  }
  return results;
}
