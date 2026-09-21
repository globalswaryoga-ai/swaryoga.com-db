import { getFullMeetingAnalytics, type SessionParticipant } from './zoom-analytics';
import { getCohort, listCohorts, listStudents, upsertAttendance, updateCohort } from './workshopBunnyRepository';

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

  const from = classDate || dayKey(cohort.startDate);
  const to = classDate || dayKey(new Date());
  const analytics = await getFullMeetingAnalytics(zoomMeetingId, from, to);
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
        duration: (current?.duration || 0) + Math.max(0, Number(participant.durationSeconds || 0)),
        joinedAt: !current?.joinedAt || new Date(participant.joinTime) < new Date(current.joinedAt) ? participant.joinTime : current.joinedAt,
        leftAt: !current?.leftAt || new Date(participant.leaveTime) > new Date(current.leftAt) ? participant.leaveTime : current.leftAt,
      });
    }

    for (const attendee of attendees.values()) {
      const classDurationSeconds = Math.max(1, Number(session.duration || 60) * 60);
      await upsertAttendance({ cohortId, studentId: attendee.student._id, classDate: session.date, joined: attendee.duration > 0, joinedAt: attendee.joinedAt, leftAt: attendee.leftAt, durationSeconds: attendee.duration, attendancePercent: Math.min(100, Math.round(attendee.duration / classDurationSeconds * 100)), source: 'zoom' });
      matched++;
      updated++;
    }
  }

  await updateCohort(cohortId, { zoomAttendanceLastSyncAt: new Date().toISOString() });
  return { cohortId: String(cohort._id), cohortName: cohort.name, sessions: sessions.length, matched, unmatched, updated, skipped: false };
}

export async function syncDueWorkshopZoomAttendance() {
  const cohorts: any[] = await listCohorts();
  // Only sync cohorts that have a Zoom Meeting ID and haven't been opted out
  const eligible = cohorts.filter((cohort) => cohort.zoomMeetingId && cohort.autoSyncZoomAttendance !== false);
  const results: SyncResult[] = [];

  for (const cohort of eligible) {
    try {
      const startDate = new Date(cohort.startDate);
      const today = new Date();
      // Don't go beyond the cohort end date
      const endDate = cohort.endDate ? new Date(cohort.endDate) : today;
      const until = endDate < today ? endDate : today;

      const holidaySet = new Set<string>(Array.isArray(cohort.holidayDates) ? cohort.holidayDates.map((d: string) => d.slice(0, 10)) : []);

      // Enumerate every calendar day from startDate up to today (or endDate)
      const classDates: string[] = [];
      const cursor = new Date(startDate);
      cursor.setHours(0, 0, 0, 0);
      until.setHours(0, 0, 0, 0);
      while (cursor <= until) {
        const dateKey = cursor.toISOString().slice(0, 10);
        if (!holidaySet.has(dateKey)) {
          classDates.push(dateKey);
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      // Sync each class date individually so we get per-day attendance records
      let totalUpdated = 0;
      let totalMatched = 0;
      let totalUnmatched = 0;
      let totalSessions = 0;
      for (const classDate of classDates) {
        try {
          const r = await syncWorkshopZoomAttendance(String(cohort._id), classDate);
          if (!r.skipped) {
            totalUpdated += r.updated;
            totalMatched += r.matched;
            totalUnmatched += r.unmatched;
            totalSessions += r.sessions;
          }
        } catch {
          // Silently skip individual dates that aren't ready yet
        }
      }

      results.push({
        cohortId: String(cohort._id),
        cohortName: cohort.name,
        sessions: totalSessions,
        matched: totalMatched,
        unmatched: totalUnmatched,
        updated: totalUpdated,
        skipped: false,
      });
    } catch (error) {
      results.push({ cohortId: String(cohort._id), cohortName: cohort.name, sessions: 0, matched: 0, unmatched: 0, updated: 0, skipped: true, message: error instanceof Error ? error.message : 'Zoom sync failed' });
    }
  }
  return results;
}
