import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getCohort, listAttendance, listCohorts, listRecordings, listStudents } from '@/lib/workshopBunnyRepository';
import { getBunnyLeadById } from '@/lib/bunnyLeadsRepository';
import { queueRegistrationTemplate, resolveRegistrationTemplate } from '@/lib/registrationAutomation';
import { normalizePhone } from '@/lib/whatsapp';
import { workshopSessionCalendar } from '@/lib/workshopSessionUtils';

import { recordingAccessPolicy } from '@/lib/workshopRecordingPolicy';
export { recordingAccessPolicy } from '@/lib/workshopRecordingPolicy';

export function recordingEligibility(attendance: { joined: boolean; durationSeconds: number } | undefined, minimumMinutes: number) {
  if (!attendance) return { eligible: false, reason: 'Attendance has not been verified for this class.' };
  if (!Number.isFinite(attendance.durationSeconds) || attendance.durationSeconds < 0)
    return { eligible: false, reason: 'Attendance duration needs administrator review.' };
  const eligible = !attendance.joined || attendance.durationSeconds < minimumMinutes * 60;
  return { eligible, reason: eligible ? '' : 'You completed this class; recording access is for absent or incomplete attendance.' };
}

async function ensureLedger() {
  await bunnyExecute(`CREATE TABLE IF NOT EXISTS workshop_recording_access_sql (
    cohort_id TEXT NOT NULL, student_id TEXT NOT NULL, class_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved', run_id TEXT, source TEXT NOT NULL,
    created_at TEXT NOT NULL, PRIMARY KEY(cohort_id, student_id, class_date))`);
}
type DeliveryContext = {
  cohort: NonNullable<Awaited<ReturnType<typeof getCohort>>>;
  students: Awaited<ReturnType<typeof listStudents>>;
  attendance: Awaited<ReturnType<typeof listAttendance>>;
  recordings: Awaited<ReturnType<typeof listRecordings>>;
};

export async function queueWorkshopRecording({
  cohortId, studentId, classDate, source, dryRun = false,
}: { cohortId: string; studentId: string; classDate: string; source: 'attendance' | 'request'; dryRun?: boolean }, context?: DeliveryContext) {
  const cohort = context?.cohort || await getCohort(cohortId);
  if (!cohort) throw new Error('Workshop not found.');
  const policy = recordingAccessPolicy(cohort.metadata?.recordingAccess);
  if (!policy.enabled) return { queued: false, message: 'Recording access is disabled for this workshop.' };
  const calendar = workshopSessionCalendar(cohort.startDate, cohort.holidayDates, 14);
  if (!calendar.some(day => !day.holiday && day.classDate === classDate))
    return { queued: false, message: 'That date is not one of the 14 workshop sessions.' };
  const [students, attendance, recordings] = context
    ? [context.students, context.attendance, context.recordings]
    : await Promise.all([listStudents(cohortId, true), listAttendance(cohortId), listRecordings(cohortId)]);
  const student = students.find(s => s._id === studentId);
  if (!student) return { queued: false, message: 'Active workshop enrollment is required.' };
  const eligibility = recordingEligibility(attendance.find(a => a.studentId === studentId && a.classDate === classDate), policy.minimumMinutes);
  if (!eligibility.eligible) return { queued: false, message: eligibility.reason };
  const recording = recordings.find(r => r.classDate === classDate);
  if (recording?.deliveredStudentIds?.includes(studentId))
    return { queued: false, message: 'This recording was already delivered; no new allowance day was consumed.' };
  const links = [recording?.youtubeSpeakerUrl, recording?.youtubeGalleryUrl, recording?.bunnySpeakerUrl, recording?.bunnyGalleryUrl]
    .filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url));
  if (!links.length) return { queued: false, message: 'The class recording is still being prepared. Please try again later.' };
  const lead = student.leadId ? await getBunnyLeadById(String(student.leadId)) : null;
  if (!lead || lead.isBlocked) return { queued: false, message: 'A linked, unblocked CRM contact is required before recording delivery.' };
  const owner = String(cohort.createdByUserId || '');
  if (!owner) throw new Error('The workshop has no sending account.');
  if (!['admin', 'admincrm'].includes(owner) && ![lead.createdByUserId, lead.assignedToUserId].includes(owner))
    throw new Error('The linked CRM contact belongs to another account.');
  const template = await resolveRegistrationTemplate(policy.templateId, owner, ['admin', 'admincrm'].includes(owner));
  const slots = [...new Set(String(template.templateContent || '').match(/\{\{\d+\}\}/g) || [])].sort();
  if (slots.length !== 1 || slots[0] !== '{{1}}' || String(template.headerFormat || '').toUpperCase() === 'DOCUMENT')
    throw new Error('Recording template must contain one body variable {{1}} for the recording links, and no document header.');
  await ensureLedger();
  const existing = await bunnyExecute({
    sql: 'SELECT status, run_id FROM workshop_recording_access_sql WHERE cohort_id=? AND student_id=? AND class_date=?',
    args: [cohortId, studentId, classDate],
  });
  if (existing.rows[0]?.run_id) return { queued: false, message: 'This class recording is already queued or sent; it uses only one allowance day.' };
  if (dryRun) {
    const usage = await bunnyExecute({ sql: 'SELECT COUNT(*) AS total FROM workshop_recording_access_sql WHERE cohort_id=? AND student_id=?', args: [cohortId, studentId] });
    return { queued: Number(usage.rows[0]?.total || 0) < policy.maxDays || Boolean(existing.rows[0]), message: 'Preview only; no message or allowance was changed.' };
  }
  // A single conditional insert is serialized by SQLite, including concurrent keyword/attendance requests.
  await bunnyExecute({
    sql: `INSERT INTO workshop_recording_access_sql (cohort_id,student_id,class_date,source,created_at)
      SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM workshop_recording_access_sql WHERE cohort_id=? AND student_id=?) < ?
      ON CONFLICT(cohort_id,student_id,class_date) DO NOTHING`,
    args: [cohortId, studentId, classDate, source, new Date().toISOString(), cohortId, studentId, policy.maxDays],
  });
  const claim = await bunnyExecute({ sql: 'SELECT run_id FROM workshop_recording_access_sql WHERE cohort_id=? AND student_id=? AND class_date=?', args: [cohortId, studentId, classDate] });
  if (!claim.rows.length) return { queued: false, message: `Your ${policy.maxDays}-day recording allowance has been used. Please contact the workshop administrator.` };
  const queued = await queueRegistrationTemplate({
    owner, eventKey: `workshop-recording:${cohortId}:${studentId}:${classDate}`, dueAt: new Date(),
    leads: [{ ...lead, phoneNumber: normalizePhone(lead.phoneNumber) }],
    template: { ...template, variables: { '1': links.join('\n') }, recordingAccess: { cohortId, studentId, classDate } },
  });
  await bunnyExecute({ sql: "UPDATE workshop_recording_access_sql SET run_id=?,status='queued' WHERE cohort_id=? AND student_id=? AND class_date=?", args: [queued.runId, cohortId, studentId, classDate] });
  return { queued: true, message: 'Your recording has been queued for Meta WhatsApp delivery.' };
}

export async function handleWorkshopRecordingRequest(input: {
  leadId: string; phoneNumber: string; messageBody: string; triggerValues?: string[];
  tenantUserId?: string | null; messageId?: string; creds?: unknown; now?: Date;
}) {
  const owner = String(input.tenantUserId || 'admincrm');
  const values = [input.messageBody, ...(input.triggerValues || [])].map(v => v.trim().toLocaleLowerCase());
  const cohorts = (await listCohorts()).filter(c => String(c.createdByUserId) === owner && c.metadata?.recordingAccess?.enabled);
  const candidates: Array<{ cohort: typeof cohorts[number]; studentId: string }> = [];
  for (const cohort of cohorts) {
    const policy = recordingAccessPolicy(cohort.metadata.recordingAccess);
    const match = policy.keywords.some(keyword => values.some(value => {
      const phrase = keyword.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(' ');
      const normalized = value.split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(' ');
      return Boolean(phrase) && ` ${normalized} `.includes(` ${phrase} `);
    }));
    if (!match) continue;
    const students = await listStudents(cohort._id, true);
    const student = students.find(s => s.leadId === input.leadId ||
      normalizePhone(s.whatsappNumber || s.phone) === normalizePhone(input.phoneNumber));
    if (student) candidates.push({ cohort, studentId: student._id });
  }
  if (!candidates.length) return { handled: false };
  if (candidates.length > 1) return { handled: true, message: 'You are enrolled in multiple workshops. Please ask the administrator to select the workshop recording.' };
  const { cohort, studentId } = candidates[0];
  const now = input.now || new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: cohort.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const explicit = input.messageBody.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  let classDate = explicit;
  if (!classDate && /\byesterday\b/i.test(input.messageBody)) {
    const day = new Date(`${today}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - 1);
    classDate = day.toISOString().slice(0, 10);
  }
  if (!classDate) classDate = workshopSessionCalendar(cohort.startDate, cohort.holidayDates, 14)
    .filter(day => !day.holiday && day.classDate < today).at(-1)?.classDate;
  if (!classDate || classDate >= today) return { handled: true, message: 'Please request a completed class using recording YYYY-MM-DD.' };
  const result = await queueWorkshopRecording({ cohortId: cohort._id, studentId, classDate, source: 'request' });
  return { handled: true, message: result.message };
}

export async function queueDueWorkshopRecordings(cohortId: string, dryRun = false) {
  const cohort = await getCohort(cohortId);
  if (!cohort?.aiWorkerEnabled || !cohort.autoSendRecordings || !cohort.metadata?.recordingAccess?.enabled)
    return { queued: 0, skipped: 0, errors: [] as string[], message: 'Attendance-based recording delivery is disabled.' };
  const [students, attendance, recordings] = await Promise.all([listStudents(cohortId, true), listAttendance(cohortId), listRecordings(cohortId)]);
  const policy = recordingAccessPolicy(cohort.metadata.recordingAccess);
  await ensureLedger();
  const existing = await bunnyExecute({ sql: 'SELECT student_id,class_date,run_id FROM workshop_recording_access_sql WHERE cohort_id=?', args: [cohortId] });
  const queued = new Set(existing.rows.filter(row => row.run_id).map(row => `${row.student_id}:${row.class_date}`));
  const result = { queued: 0, skipped: 0, errors: [] as string[] };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: cohort.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  for (const recording of recordings) {
    if (recording.classDate >= today) continue;
    for (const student of students) {
      if (result.queued >= 25) return { ...result, message: 'Next scheduled run will continue the remaining students.' };
      if (queued.has(`${student._id}:${recording.classDate}`) || recording.deliveredStudentIds?.includes(student._id) ||
          !recordingEligibility(attendance.find(a => a.studentId === student._id && a.classDate === recording.classDate), policy.minimumMinutes).eligible) {
        result.skipped++;
        continue;
      }
      try {
        const delivery = await queueWorkshopRecording({ cohortId, studentId: student._id, classDate: recording.classDate, source: 'attendance', dryRun },
          { cohort, students, attendance, recordings });
        delivery.queued ? result.queued++ : result.skipped++;
      } catch (error) {
        result.errors.push(`${student.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return result;
}
