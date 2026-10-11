import { getFullMeetingAnalytics, type SessionParticipant } from './zoom-analytics';
import { getCohort, listCohorts, listStudents, upsertAttendance, updateCohort } from './workshopBunnyRepository';
import { workshopSessionCalendar, attendanceDuration } from './workshopSessionUtils';

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
  const cohort: any = await getCohort(cohortId);

  if (!cohort) throw new Error('Workshop not found');
  if (!cohort.zoomMeetingId) throw new Error('This workshop does not have a Zoom meeting ID');

  // Strip spaces — Zoom Meeting IDs are often stored/entered as "851 5544 6286"
  // but Zoom API only accepts "85155446286" (no spaces).
  const zoomMeetingId = String(cohort.zoomMeetingId).replace(/\s+/g, '');

  const students: any[] = await listStudents(cohortId, true);
  // We no longer abort if students is empty, because we auto-enroll attendees from Zoom.

  const from = dayKey(new Date(new Date(classDate || cohort.startDate).getTime() - 86400000));
  const to = classDate || dayKey(new Date());
  let analytics: Awaited<ReturnType<typeof getFullMeetingAnalytics>>;
  try {
    analytics = await getFullMeetingAnalytics(zoomMeetingId, from, to);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`No sessions found for meeting ${zoomMeetingId} in the selected date range`)) {
      return { cohortId, cohortName: cohort.name, sessions: 0, matched: 0, unmatched: 0, updated: 0, skipped: true, message: 'Zoom has not published a completed report in this date range yet.' };
    }
    throw error;
  }
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: cohort.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  analytics.sessions = analytics.sessions.map(session => ({ ...session, date: dateFormatter.format(new Date(session.startTime)) }));
  const sessionDates = new Set(workshopSessionCalendar(dayKey(cohort.startDate), cohort.holidayDates || []).filter(row => !row.holiday).map(row => row.classDate));
  const sessions = [...new Map(analytics.sessions.filter((session) => sessionDates.has(session.date) && (!classDate || session.date === classDate)).map(session => [session.uuid, session])).values()];
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

  // Group sessions by date to prevent overwriting attendance for multiple sessions on the same day
  const sessionsByDate = new Map<string, any[]>();
  for (const session of sessions) {
    if (!sessionsByDate.has(session.date)) sessionsByDate.set(session.date, []);
    sessionsByDate.get(session.date)!.push(session);
  }

  for (const [classDateKey, dailySessions] of sessionsByDate.entries()) {
    const attendees = new Map<string, { student: any; duration: number; participants: SessionParticipant[]; joinedAt?: string; leftAt?: string }>();
    let totalClassDuration = 0;

    for (const session of dailySessions) {
      totalClassDuration += Math.max(1, Number(session.duration || 60) * 60);

      for (const participant of session.participants as SessionParticipant[]) {
        let student = findStudent(participant);
        
        // Auto-enroll unmatched participants as students
        if (!student) {
          const { upsertStudent } = await import('./workshopBunnyRepository');
          const { getBunnyLeadByEmail, getBunnyLeadByPhone } = await import('./bunnyLeadsRepository');

          // Try to find the CRM lead to enrich the student's mobile / WhatsApp number
          let crmLead: any = null;
          if (participant.email) {
            crmLead = await getBunnyLeadByEmail(participant.email).catch(() => null);
          }
          if (!crmLead) {
            // Try by phone number embedded in the Zoom display name (e.g. "Mohan 9876543210")
            const phoneFromName = phoneKey(participant.name);
            if (phoneFromName) crmLead = await getBunnyLeadByPhone(phoneFromName).catch(() => null);
          }

          const whatsappNumber = crmLead?.whatsappNumber || crmLead?.phoneNumber || null;

          student = await upsertStudent({
            cohortId,
            name: participant.name || 'Unknown Attendee',
            email: participant.email || crmLead?.email || null,
            phone: whatsappNumber,
            whatsappNumber,
            leadId: crmLead?._id || null,
            leadNumber: crmLead?.leadNumber || null,
            source: 'zoom',
          });
          
          if (student) {
            students.push(student);
            if (student.email) byEmail.set(normalise(student.email), student);
            if (student.name) byName.set(normalise(student.name), student);
            const phone = phoneKey(student.whatsappNumber || student.phone || student.name || student.email || '');
            if (phone) byPhone.set(phone, student);
          }
        }

        if (!student) { unmatched++; continue; }

        // Back-fill WhatsApp number from CRM lead if the existing student record has none
        if (!student.whatsappNumber && !student.phone && student.email) {
          try {
            const { getBunnyLeadByEmail } = await import('./bunnyLeadsRepository');
            const { upsertStudent } = await import('./workshopBunnyRepository');
            const crmLead = await getBunnyLeadByEmail(student.email).catch(() => null);
            if (crmLead?.phoneNumber || crmLead?.whatsappNumber) {
              const wa = crmLead.whatsappNumber || crmLead.phoneNumber;
              const enriched = await upsertStudent({ ...student, cohortId, whatsappNumber: wa, phone: wa, leadId: crmLead._id || student.leadId });
              if (enriched) {
                student = enriched;
                // Update lookup maps
                byPhone.set(phoneKey(wa), student);
              }
            }
          } catch { /* non-fatal */ }
        }

        const key = String(student._id);

        const current = attendees.get(key);
        attendees.set(key, {
          student,
          duration: 0,
          participants: [...(current?.participants || []), participant],
          joinedAt: !current?.joinedAt || new Date(participant.joinTime) < new Date(current.joinedAt) ? participant.joinTime : current.joinedAt,
          leftAt: !current?.leftAt || new Date(participant.leaveTime) > new Date(current.leftAt) ? participant.leaveTime : current.leftAt,
        });
      }
    }

    for (const attendee of attendees.values()) {
      attendee.duration = attendanceDuration(attendee.participants);
      await upsertAttendance({ cohortId, studentId: attendee.student._id, classDate: classDateKey, joined: attendee.duration > 0, joinedAt: attendee.joinedAt, leftAt: attendee.leftAt, durationSeconds: attendee.duration, attendancePercent: Math.min(100, Math.round(attendee.duration / totalClassDuration * 100)), source: 'zoom', metadata: { zoomParticipants: attendee.participants, zoomSessionIds: dailySessions.map(session => session.uuid) } });
      matched++;
      updated++;
    }
  }

  await updateCohort(cohortId, { zoomAttendanceLastSyncAt: new Date().toISOString() });
  return { cohortId: String(cohort._id), cohortName: cohort.name, sessions: sessionsByDate.size, matched, unmatched, updated, skipped: false, message: analytics._errors?.join('; ') };
}

export async function syncDueWorkshopZoomAttendance() {
  const cohorts: any[] = await listCohorts();
  // Only sync cohorts that have a Zoom Meeting ID and haven't been opted out
  const eligible = cohorts.filter((cohort) => cohort.zoomMeetingId && cohort.autoSyncZoomAttendance !== false);
  const results: SyncResult[] = [];

  for (const cohort of eligible) {
    try {
      results.push(await syncWorkshopZoomAttendance(String(cohort._id)));
    } catch (error) {
      results.push({ cohortId: String(cohort._id), cohortName: cohort.name, sessions: 0, matched: 0, unmatched: 0, updated: 0, skipped: true, message: error instanceof Error ? error.message : 'Zoom sync failed' });
    }
  }
  return results;
}
