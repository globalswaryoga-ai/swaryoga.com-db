import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

export type BunnyWorkshopCohort = Record<string, any> & { _id: string };
export type BunnyWorkshopStudent = Record<string, any> & { _id: string };
export type BunnyWorkshopAttendance = Record<string, any> & { _id: string };
export type BunnyWorkshopRecording = Record<string, any> & { _id: string };

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const json = (value: unknown, fallback: unknown) => JSON.stringify(value ?? fallback);
const parse = <T>(value: unknown, fallback: T): T => {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
};
const bool = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true';

function cohort(row: any): BunnyWorkshopCohort {
  return { ...row, _id: String(row.id), startDate: row.start_date, endDate: row.end_date, classStartTime: row.class_start_time, classEndTime: row.class_end_time, zoomMeetingId: row.zoom_meeting_id, zoomJoinUrl: row.zoom_join_url, whatsappGroupLink: row.whatsapp_group_link, googleFormLink: row.google_form_link, aiWorkerEnabled: bool(row.ai_worker_enabled), autoSyncWhatsappGroup: bool(row.auto_sync_whatsapp_group), autoSendRecordings: bool(row.auto_send_recordings), autoSyncZoomAttendance: bool(row.auto_sync_zoom_attendance), autoRecoverZoomTrash: bool(row.auto_recover_zoom_trash), zoomAttendanceLastSyncAt: row.zoom_attendance_last_sync_at, workerLastRunAt: row.worker_last_run_at, whatsappGroupId: row.whatsapp_group_id, communityId: row.community_id, recordingPolicy: row.recording_policy, createdByUserId: row.created_by_user_id, holidayDates: parse(row.holiday_dates_json, []), youtubePlaylistName: row.youtube_playlist_name || null, thumbnailUrl: row.thumbnail_url || null, daySubjects: parse(row.day_subjects_json, []), metadata: parse(row.metadata_json, {}) };
}
function student(row: any): BunnyWorkshopStudent { return { ...row, _id: String(row.id), cohortId: row.cohort_id, whatsappJid: row.whatsapp_jid, whatsappNumber: row.whatsapp_number, leadId: row.lead_id, leadNumber: row.lead_number, active: bool(row.active), metadata: parse(row.metadata_json, {}) }; }
function attendance(row: any): BunnyWorkshopAttendance { return { ...row, _id: String(row.id), cohortId: row.cohort_id, studentId: row.student_id, classDate: row.class_date, joinedAt: row.joined_at, leftAt: row.left_at, joined: bool(row.joined), durationSeconds: Number(row.duration_seconds || 0), attendancePercent: Number(row.attendance_percent || 0), metadata: parse(row.metadata_json, {}) }; }
function recording(row: any): BunnyWorkshopRecording { return { ...row, _id: String(row.id), cohortId: row.cohort_id, classDate: row.class_date, dayNumber: row.day_number, zoomMeetingId: row.zoom_meeting_id, zoomMeetingUuid: row.zoom_meeting_uuid, youtubeSpeakerId: row.youtube_speaker_id, youtubeGalleryId: row.youtube_gallery_id, youtubeSpeakerUrl: row.youtube_speaker_url, youtubeGalleryUrl: row.youtube_gallery_url, bunnySpeakerUrl: row.bunny_speaker_url, bunnyGalleryUrl: row.bunny_gallery_url, deliveredStudentIds: parse(row.delivered_student_ids_json, []), metadata: parse(row.metadata_json, {}) }; }

export async function initWorkshopBunnySchema() {
  try { await bunnyExecute('ALTER TABLE workshop_cohorts_sql ADD COLUMN auto_recover_zoom_trash INTEGER NOT NULL DEFAULT 0'); } catch(e) {}
  await bunnyBatch([
    { sql: `CREATE TABLE IF NOT EXISTS workshop_cohorts_sql (id TEXT PRIMARY KEY,name TEXT NOT NULL,start_date TEXT NOT NULL,end_date TEXT,holiday_dates_json TEXT NOT NULL DEFAULT '[]',class_start_time TEXT,class_end_time TEXT,timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',zoom_meeting_id TEXT,zoom_join_url TEXT,whatsapp_group_link TEXT,google_form_link TEXT,youtube_playlist_name TEXT,thumbnail_url TEXT,day_subjects_json TEXT NOT NULL DEFAULT '[]',ai_worker_enabled INTEGER NOT NULL DEFAULT 1,auto_sync_whatsapp_group INTEGER NOT NULL DEFAULT 0,auto_send_recordings INTEGER NOT NULL DEFAULT 0,auto_sync_zoom_attendance INTEGER NOT NULL DEFAULT 1,auto_recover_zoom_trash INTEGER NOT NULL DEFAULT 0,zoom_attendance_last_sync_at TEXT,worker_last_run_at TEXT,whatsapp_group_id TEXT,community_id TEXT,recording_policy TEXT NOT NULL DEFAULT 'speaker_and_gallery',created_by_user_id TEXT,metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)` , args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS workshop_students_sql (id TEXT PRIMARY KEY,cohort_id TEXT NOT NULL,name TEXT NOT NULL,email TEXT,phone TEXT,whatsapp_jid TEXT,whatsapp_number TEXT,lead_id TEXT,lead_number TEXT,source TEXT NOT NULL DEFAULT 'manual',active INTEGER NOT NULL DEFAULT 1,metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`, args: [] },
    { sql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_workshop_student_jid ON workshop_students_sql(cohort_id,whatsapp_jid)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_workshop_student_email ON workshop_students_sql(cohort_id,email)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_workshop_student_phone ON workshop_students_sql(cohort_id,phone)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_workshop_student_whatsapp_number ON workshop_students_sql(cohort_id,whatsapp_number)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_workshop_students_cohort ON workshop_students_sql(cohort_id,active)`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS workshop_attendance_sql (id TEXT PRIMARY KEY,cohort_id TEXT NOT NULL,student_id TEXT NOT NULL,class_date TEXT NOT NULL,joined_at TEXT,left_at TEXT,joined INTEGER NOT NULL DEFAULT 0,duration_seconds INTEGER NOT NULL DEFAULT 0,attendance_percent INTEGER NOT NULL DEFAULT 0,source TEXT NOT NULL DEFAULT 'zoom',metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`, args: [] },
    { sql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_workshop_attendance ON workshop_attendance_sql(cohort_id,student_id,class_date)`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS workshop_recordings_sql (id TEXT PRIMARY KEY,cohort_id TEXT NOT NULL,class_date TEXT NOT NULL,day_number INTEGER,zoom_meeting_id TEXT,zoom_meeting_uuid TEXT,youtube_speaker_id TEXT,youtube_gallery_id TEXT,youtube_speaker_url TEXT,youtube_gallery_url TEXT,bunny_speaker_url TEXT,bunny_gallery_url TEXT,delivered_student_ids_json TEXT NOT NULL DEFAULT '[]',metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`, args: [] },
    { sql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_workshop_recordings ON workshop_recordings_sql(cohort_id,class_date)`, args: [] },
  ]);
}

export async function listCohorts() { await initWorkshopBunnySchema(); const r = await bunnyExecute('SELECT * FROM workshop_cohorts_sql ORDER BY start_date DESC'); return r.rows.map(cohort); }
export async function getCohort(cohortId: string) { await initWorkshopBunnySchema(); const r = await bunnyExecute({ sql: 'SELECT * FROM workshop_cohorts_sql WHERE id = ?', args: [cohortId] }); return r.rows[0] ? cohort(r.rows[0]) : null; }
export async function findCohortByZoom(zoomMeetingId: string) { await initWorkshopBunnySchema(); const r = await bunnyExecute({ sql: 'SELECT * FROM workshop_cohorts_sql WHERE zoom_meeting_id = ? LIMIT 1', args: [zoomMeetingId] }); return r.rows[0] ? cohort(r.rows[0]) : null; }
export async function saveCohort(input: Record<string, any>, userId?: string, cohortId = id()) { await initWorkshopBunnySchema(); const timestamp = now(); await bunnyExecute({ sql: `INSERT INTO workshop_cohorts_sql (id,name,start_date,end_date,holiday_dates_json,class_start_time,class_end_time,timezone,zoom_meeting_id,zoom_join_url,whatsapp_group_link,google_form_link,youtube_playlist_name,thumbnail_url,day_subjects_json,ai_worker_enabled,auto_sync_whatsapp_group,auto_send_recordings,auto_sync_zoom_attendance,auto_recover_zoom_trash,whatsapp_group_id,community_id,recording_policy,created_by_user_id,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,start_date=excluded.start_date,end_date=excluded.end_date,holiday_dates_json=excluded.holiday_dates_json,class_start_time=excluded.class_start_time,class_end_time=excluded.class_end_time,timezone=excluded.timezone,zoom_meeting_id=excluded.zoom_meeting_id,zoom_join_url=excluded.zoom_join_url,whatsapp_group_link=excluded.whatsapp_group_link,google_form_link=excluded.google_form_link,youtube_playlist_name=excluded.youtube_playlist_name,thumbnail_url=excluded.thumbnail_url,day_subjects_json=excluded.day_subjects_json,ai_worker_enabled=excluded.ai_worker_enabled,auto_send_recordings=excluded.auto_send_recordings,auto_recover_zoom_trash=excluded.auto_recover_zoom_trash,updated_at=excluded.updated_at`, args: [cohortId,String(input.name || '').trim(),String(input.startDate),input.endDate || null,json(input.holidayDates,[]),input.classStartTime || null,input.classEndTime || null,input.timezone || 'Asia/Kolkata',input.zoomMeetingId || null,input.zoomJoinUrl || null,input.whatsappGroupLink || null,input.googleFormLink || null,input.youtubePlaylistName || null,input.thumbnailUrl || null,json(input.daySubjects,[]),input.aiWorkerEnabled === false ? 0 : 1,input.autoSyncWhatsappGroup ? 1 : 0,input.autoSendRecordings ? 1 : 0,input.autoSyncZoomAttendance === false ? 0 : 1,input.autoRecoverZoomTrash ? 1 : 0,input.whatsappGroupId || null,input.communityId || null,'speaker_and_gallery',userId || null,'{}',timestamp,timestamp] }); return getCohort(cohortId); }
export async function updateCohort(cohortId: string, fields: Record<string, any>) { await initWorkshopBunnySchema(); const allowed: Record<string,string> = { googleFormLink: 'google_form_link', workerLastRunAt: 'worker_last_run_at', zoomAttendanceLastSyncAt: 'zoom_attendance_last_sync_at' }; const sets = Object.entries(fields).filter(([key]) => allowed[key] && fields[key] !== undefined); if (!sets.length) return getCohort(cohortId); await bunnyExecute({ sql: `UPDATE workshop_cohorts_sql SET ${sets.map(([key]) => `${allowed[key]} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, args: [...sets.map(([,value]) => value || null), now(), cohortId] }); return getCohort(cohortId); }

export async function editCohort(cohortId: string, input: Record<string, any>) {
  await initWorkshopBunnySchema();
  await bunnyExecute({
    sql: `UPDATE workshop_cohorts_sql SET
      name = ?, start_date = ?, end_date = ?, holiday_dates_json = ?,
      class_start_time = ?, class_end_time = ?,
      zoom_meeting_id = ?, zoom_join_url = ?,
      whatsapp_group_link = ?, google_form_link = ?,
      youtube_playlist_name = ?, thumbnail_url = ?, day_subjects_json = ?,
      ai_worker_enabled = ?, auto_send_recordings = ?, auto_sync_zoom_attendance = ?, auto_recover_zoom_trash = ?,
      updated_at = ?
    WHERE id = ?`,
    args: [
      String(input.name || '').trim(),
      String(input.startDate),
      input.endDate || null,
      JSON.stringify(Array.isArray(input.holidayDates) ? input.holidayDates : []),
      input.classStartTime || null,
      input.classEndTime || null,
      input.zoomMeetingId ? String(input.zoomMeetingId).replace(/\s+/g, '') : null,
      input.zoomJoinUrl || null,
      input.whatsappGroupLink || null,
      input.googleFormLink || null,
      input.youtubePlaylistName || null,
      input.thumbnailUrl || null,
      JSON.stringify(Array.isArray(input.daySubjects) ? input.daySubjects : []),
      input.aiWorkerEnabled === false ? 0 : 1,
      input.autoSendRecordings ? 1 : 0,
      input.autoSyncZoomAttendance === false ? 0 : 1,
      input.autoRecoverZoomTrash ? 1 : 0,
      now(),
      cohortId,
    ]
  });
  return getCohort(cohortId);
}

export async function deleteCohort(cohortId: string) {
  await initWorkshopBunnySchema();
  // Delete all related records, then the cohort itself
  await bunnyExecute({ sql: 'DELETE FROM workshop_attendance_sql WHERE cohort_id = ?', args: [cohortId] });
  await bunnyExecute({ sql: 'DELETE FROM workshop_students_sql WHERE cohort_id = ?', args: [cohortId] });
  await bunnyExecute({ sql: 'DELETE FROM workshop_recordings_sql WHERE cohort_id = ?', args: [cohortId] });
  await bunnyExecute({ sql: 'DELETE FROM workshop_cohorts_sql WHERE id = ?', args: [cohortId] });
}

export async function listStudents(cohortId: string, activeOnly = false) { await initWorkshopBunnySchema(); const r = await bunnyExecute({ sql: `SELECT * FROM workshop_students_sql WHERE cohort_id = ? ${activeOnly ? 'AND active = 1' : ''} ORDER BY name`, args: [cohortId] }); return r.rows.map(student); }
export async function getStudent(studentId: string) { await initWorkshopBunnySchema(); const r = await bunnyExecute({ sql: 'SELECT * FROM workshop_students_sql WHERE id = ?', args: [studentId] }); return r.rows[0] ? student(r.rows[0]) : null; }
export async function upsertStudent(input: Record<string, any>, studentId = id()) { await initWorkshopBunnySchema(); const existing = input.whatsappJid ? await bunnyExecute({ sql: 'SELECT id FROM workshop_students_sql WHERE cohort_id = ? AND whatsapp_jid = ? LIMIT 1', args: [input.cohortId,input.whatsappJid] }) : input.phone ? await bunnyExecute({ sql: 'SELECT id FROM workshop_students_sql WHERE cohort_id = ? AND phone = ? LIMIT 1', args: [input.cohortId,input.phone] }) : { rows: [] }; const actualId = existing.rows[0]?.id ? String(existing.rows[0].id) : studentId; await bunnyExecute({ sql: `INSERT INTO workshop_students_sql (id,cohort_id,name,email,phone,whatsapp_jid,whatsapp_number,lead_id,lead_number,source,active,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,phone=excluded.phone,whatsapp_jid=excluded.whatsapp_jid,whatsapp_number=excluded.whatsapp_number,lead_id=excluded.lead_id,lead_number=excluded.lead_number,source=excluded.source,active=excluded.active,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at`, args: [actualId,input.cohortId,String(input.name || '').trim(),input.email || null,input.phone || null,input.whatsappJid || null,input.whatsappNumber || null,input.leadId || null,input.leadNumber || null,input.source || 'manual',input.active === false ? 0 : 1,json(input.metadata,{ }),now(),now()] }); return getStudent(actualId); }
export async function deactivateStudent(studentId: string) { await initWorkshopBunnySchema(); await bunnyExecute({ sql: 'UPDATE workshop_students_sql SET active = 0, updated_at = ? WHERE id = ?', args: [now(),studentId] }); }

export async function listAttendance(cohortId: string) { await initWorkshopBunnySchema(); const r = await bunnyExecute({ sql: 'SELECT * FROM workshop_attendance_sql WHERE cohort_id = ? ORDER BY class_date DESC', args: [cohortId] }); return r.rows.map(attendance); }
export async function upsertAttendance(input: Record<string, any>, attendanceId = id()) { await initWorkshopBunnySchema(); const date = String(input.classDate).slice(0,10); const r = await bunnyExecute({ sql: 'SELECT id FROM workshop_attendance_sql WHERE cohort_id = ? AND student_id = ? AND class_date = ?', args: [input.cohortId,input.studentId,date] }); const actualId = r.rows[0]?.id ? String(r.rows[0].id) : attendanceId; await bunnyExecute({ sql: `INSERT INTO workshop_attendance_sql (id,cohort_id,student_id,class_date,joined_at,left_at,joined,duration_seconds,attendance_percent,source,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET joined_at=excluded.joined_at,left_at=excluded.left_at,joined=excluded.joined,duration_seconds=excluded.duration_seconds,attendance_percent=excluded.attendance_percent,source=excluded.source,updated_at=excluded.updated_at`, args: [actualId,input.cohortId,input.studentId,date,input.joinedAt || null,input.leftAt || null,input.joined ? 1 : 0,Number(input.durationSeconds || 0),Number(input.attendancePercent || 0),input.source || 'manual',json(input.metadata,{}),now(),now()] }); const rows=await bunnyExecute({sql:'SELECT * FROM workshop_attendance_sql WHERE id=?',args:[actualId]});return attendance(rows.rows[0]); }

export async function listRecordings(cohortId: string) { await initWorkshopBunnySchema(); const r = await bunnyExecute({ sql: 'SELECT * FROM workshop_recordings_sql WHERE cohort_id = ? ORDER BY class_date DESC', args: [cohortId] }); return r.rows.map(recording); }
export async function upsertRecording(input: Record<string, any>, recordingId = id()) { await initWorkshopBunnySchema(); const date=String(input.classDate).slice(0,10); const r=await bunnyExecute({sql:'SELECT id FROM workshop_recordings_sql WHERE cohort_id=? AND class_date=?',args:[input.cohortId,date]});const actualId=r.rows[0]?.id?String(r.rows[0].id):recordingId;await bunnyExecute({sql:`INSERT INTO workshop_recordings_sql (id,cohort_id,class_date,day_number,zoom_meeting_id,zoom_meeting_uuid,youtube_speaker_id,youtube_gallery_id,youtube_speaker_url,youtube_gallery_url,bunny_speaker_url,bunny_gallery_url,delivered_student_ids_json,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET day_number=excluded.day_number,zoom_meeting_id=excluded.zoom_meeting_id,zoom_meeting_uuid=excluded.zoom_meeting_uuid,youtube_speaker_id=excluded.youtube_speaker_id,youtube_gallery_id=excluded.youtube_gallery_id,youtube_speaker_url=excluded.youtube_speaker_url,youtube_gallery_url=excluded.youtube_gallery_url,bunny_speaker_url=excluded.bunny_speaker_url,bunny_gallery_url=excluded.bunny_gallery_url,delivered_student_ids_json=excluded.delivered_student_ids_json,updated_at=excluded.updated_at`,args:[actualId,input.cohortId,date,input.dayNumber||null,input.zoomMeetingId||null,input.zoomMeetingUuid||null,input.youtubeSpeakerId||null,input.youtubeGalleryId||null,input.youtubeSpeakerUrl||null,input.youtubeGalleryUrl||null,input.bunnySpeakerUrl||null,input.bunnyGalleryUrl||null,json(input.deliveredStudentIds,[]),json(input.metadata,{}),now(),now()]});const rows=await bunnyExecute({sql:'SELECT * FROM workshop_recordings_sql WHERE id=?',args:[actualId]});return recording(rows.rows[0]); }
export async function markRecordingDelivered(recordingId: string, studentIds: string[]) { const current=await bunnyExecute({sql:'SELECT delivered_student_ids_json FROM workshop_recordings_sql WHERE id=?',args:[recordingId]});const existing=parse<string[]>(current.rows[0]?.delivered_student_ids_json,[]);const merged=[...new Set([...existing,...studentIds])];await bunnyExecute({sql:'UPDATE workshop_recordings_sql SET delivered_student_ids_json=?,updated_at=? WHERE id=?',args:[JSON.stringify(merged),now(),recordingId]}); }
