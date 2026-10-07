import crypto from 'crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

export type BunnySadhanaProgram = Record<string, any> & { _id: string };
export type BunnySadhanaProgramVideo = Record<string, any> & { _id: string };
export type BunnySadhanaSession = Record<string, any> & { _id: string };
export type BunnySadhanaParticipant = Record<string, any> & { _id: string };

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const json = (value: unknown, fallback: unknown) => JSON.stringify(value ?? fallback);
const parse = <T>(value: unknown, fallback: T): T => {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
};
const bool = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true';

export async function initSadhanaBunnySchema() {
  await bunnyBatch([
    { sql: `CREATE TABLE IF NOT EXISTS sadhana_programs_sql (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      time_slots_json TEXT NOT NULL DEFAULT '[]',
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      video_duration INTEGER NOT NULL DEFAULT 40,
      countdown_minutes INTEGER NOT NULL DEFAULT 3,
      days_json TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
      repeat_frequency TEXT NOT NULL DEFAULT 'daily',
      start_date TEXT,
      bot_name TEXT NOT NULL DEFAULT '🤖 Swar Yoga Bot',
      bot_join_minutes INTEGER NOT NULL DEFAULT 5,
      enable_bot_automation INTEGER NOT NULL DEFAULT 1,
      video_calendar_json TEXT NOT NULL DEFAULT '{}',
      player_mode TEXT NOT NULL DEFAULT 'player',
      player_url TEXT,
      zoom_link TEXT,
      zoom_id TEXT,
      zoom_password TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_by_user_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS sadhana_program_videos_sql (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      video_url TEXT NOT NULL,
      hls_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(program_id, date)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS sadhana_sessions_sql (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      program_slug TEXT NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(program_id, date, time_slot)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS sadhana_live_participants_sql (
      id TEXT PRIMARY KEY,
      program_slug TEXT NOT NULL,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      UNIQUE(program_slug, session_id, name)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS sadhana_join_history_sql (
      id TEXT PRIMARY KEY,
      program_slug TEXT NOT NULL,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      left_at TEXT,
      duration_minutes INTEGER
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS sadhana_schedules_sql (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      bot_pid INTEGER,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(program_id, date, time_slot)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS sadhana_live_chat_sql (
      id TEXT PRIMARY KEY,
      program_slug TEXT NOT NULL,
      session_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`, args: [] }
  ]);
  
  // Try to add columns if they don't exist
  try {
    await bunnyExecute({ sql: 'ALTER TABLE sadhana_programs_sql ADD COLUMN zoom_link TEXT' });
    await bunnyExecute({ sql: 'ALTER TABLE sadhana_programs_sql ADD COLUMN zoom_id TEXT' });
    await bunnyExecute({ sql: 'ALTER TABLE sadhana_programs_sql ADD COLUMN zoom_password TEXT' });
  } catch (e) {}
}

// Map db row to JS object
function mapProgram(row: any) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description,
    timeSlots: parse(row.time_slots_json, []),
    timezone: row.timezone,
    videoDuration: Number(row.video_duration),
    countdownMinutes: Number(row.countdown_minutes),
    days: parse(row.days_json, []),
    repeatFrequency: row.repeat_frequency,
    startDate: row.start_date,
    botName: row.bot_name,
    botJoinMinutes: Number(row.bot_join_minutes),
    enableBotAutomation: bool(row.enable_bot_automation),
    videoCalendar: parse(row.video_calendar_json, {}),
    playerMode: row.player_mode,
    playerUrl: row.player_url,
    zoomLink: row.zoom_link,
    zoomId: row.zoom_id,
    zoomPassword: row.zoom_password,
    active: bool(row.active),
    createdByUserId: row.created_by_user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listPrograms(filter: any = {}) {
  await initSadhanaBunnySchema();
  let sql = 'SELECT * FROM sadhana_programs_sql';
  let args: any[] = [];
  let wheres: string[] = [];
  if (filter.createdByUserId) {
    wheres.push('created_by_user_id = ?');
    args.push(filter.createdByUserId);
  }
  if (filter.active !== undefined) {
    wheres.push('active = ?');
    args.push(filter.active ? 1 : 0);
  }
  if (wheres.length > 0) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' ORDER BY created_at DESC';
  const r = await bunnyExecute({ sql, args });
  return r.rows.map(mapProgram);
}

export async function getProgram(idOrSlug: string) {
  await initSadhanaBunnySchema();
  const r = await bunnyExecute({
    sql: 'SELECT * FROM sadhana_programs_sql WHERE id = ? OR slug = ? LIMIT 1',
    args: [idOrSlug, idOrSlug]
  });
  return mapProgram(r.rows[0]);
}

export async function insertProgram(doc: any) {
  await initSadhanaBunnySchema();
  const pid = id();
  await bunnyExecute({
    sql: `INSERT INTO sadhana_programs_sql (
      id, slug, name, description, time_slots_json, timezone, video_duration, countdown_minutes,
      days_json, repeat_frequency, start_date, bot_name, bot_join_minutes, enable_bot_automation,
      video_calendar_json, player_mode, player_url, zoom_link, zoom_id, zoom_password, active, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      pid,
      doc.slug,
      doc.name,
      doc.description || '',
      json(doc.timeSlots, []),
      doc.timezone || 'Asia/Kolkata',
      doc.videoDuration || 40,
      doc.countdownMinutes || 3,
      json(doc.days, []),
      doc.repeatFrequency || 'daily',
      doc.startDate || null,
      doc.botName || '🤖 Swar Yoga Bot',
      doc.botJoinMinutes || 5,
      doc.enableBotAutomation === false ? 0 : 1,
      json(doc.videoCalendar, {}),
      doc.playerMode || 'player',
      doc.playerUrl || '',
      doc.zoomLink || null,
      doc.zoomId || null,
      doc.zoomPassword || null,
      doc.active === false ? 0 : 1,
      doc.createdByUserId || null,
      now(),
      now()
    ]
  });
  return getProgram(pid);
}

export async function updateProgram(pid: string, updates: any) {
  await initSadhanaBunnySchema();
  const setCols: string[] = [];
  const args: any[] = [];
  
  const colMap: any = {
    name: 'name',
    description: 'description',
    timezone: 'timezone',
    repeatFrequency: 'repeat_frequency',
    startDate: 'start_date',
    botName: 'bot_name',
    botJoinMinutes: 'bot_join_minutes',
    playerMode: 'player_mode',
    playerUrl: 'player_url',
    zoomLink: 'zoom_link',
    zoomId: 'zoom_id',
    zoomPassword: 'zoom_password',
    enableBotAutomation: 'enable_bot_automation',
    active: 'active',
    timeSlots: 'time_slots_json',
    videoDuration: 'video_duration',
    countdownMinutes: 'countdown_minutes',
    days: 'days_json',
    videoCalendar: 'video_calendar_json'
  };

  for (const [k, v] of Object.entries(updates)) {
    if (colMap[k]) {
      setCols.push(`${colMap[k]} = ?`);
      if (['timeSlots', 'days', 'videoCalendar'].includes(k)) {
        args.push(json(v, {}));
      } else if (typeof v === 'boolean') {
        args.push(v ? 1 : 0);
      } else {
        args.push(v);
      }
    }
  }

  if (setCols.length === 0) return getProgram(pid);

  setCols.push('updated_at = ?');
  args.push(now());
  args.push(pid);

  await bunnyExecute({
    sql: `UPDATE sadhana_programs_sql SET ${setCols.join(', ')} WHERE id = ?`,
    args
  });
  return getProgram(pid);
}

export async function deleteProgram(pid: string) {
  await initSadhanaBunnySchema();
  await bunnyExecute({ sql: 'DELETE FROM sadhana_programs_sql WHERE id = ?', args: [pid] });
  await bunnyExecute({ sql: 'DELETE FROM sadhana_program_videos_sql WHERE program_id = ?', args: [pid] });
  await bunnyExecute({ sql: 'DELETE FROM sadhana_sessions_sql WHERE program_id = ?', args: [pid] });
}

function mapVideo(row: any) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    programId: row.program_id,
    date: row.date,
    title: row.title,
    videoUrl: row.video_url,
    hlsUrl: row.hls_url,
    order: row.sort_order,
    createdAt: new Date(row.created_at)
  };
}

export async function listProgramVideos(programId: string) {
  await initSadhanaBunnySchema();
  const r = await bunnyExecute({
    sql: 'SELECT * FROM sadhana_program_videos_sql WHERE program_id = ? ORDER BY date ASC',
    args: [programId]
  });
  return r.rows.map(mapVideo);
}

export async function insertProgramVideo(doc: any) {
  await initSadhanaBunnySchema();
  const vid = id();
  await bunnyExecute({
    sql: `INSERT INTO sadhana_program_videos_sql (id, program_id, date, title, video_url, hls_url, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [vid, doc.programId, doc.date, doc.title, doc.videoUrl, doc.hlsUrl || null, doc.order || 0, now()]
  });
  return vid;
}

export async function deleteProgramVideo(vid: string) {
  await initSadhanaBunnySchema();
  await bunnyExecute({ sql: 'DELETE FROM sadhana_program_videos_sql WHERE id = ?', args: [vid] });
}

export async function updateProgramVideo(vid: string, updates: any) {
  await initSadhanaBunnySchema();
  const setCols: string[] = [];
  const args: any[] = [];
  
  if (updates.title !== undefined) { setCols.push('title = ?'); args.push(updates.title); }
  if (updates.videoUrl !== undefined) { setCols.push('video_url = ?'); args.push(updates.videoUrl); }
  if (updates.hlsUrl !== undefined) { setCols.push('hls_url = ?'); args.push(updates.hlsUrl); }
  
  if (setCols.length === 0) return;
  args.push(vid);
  await bunnyExecute({
    sql: `UPDATE sadhana_program_videos_sql SET ${setCols.join(', ')} WHERE id = ?`,
    args
  });
}

export async function getProgramVideoById(vid: string) {
  await initSadhanaBunnySchema();
  const r = await bunnyExecute({ sql: 'SELECT * FROM sadhana_program_videos_sql WHERE id = ? LIMIT 1', args: [vid] });
  return mapVideo(r.rows[0]);
}

export async function getProgramVideoByDate(programId: string, date: string) {
  await initSadhanaBunnySchema();
  const r = await bunnyExecute({ sql: 'SELECT * FROM sadhana_program_videos_sql WHERE program_id = ? AND date = ? LIMIT 1', args: [programId, date] });
  return mapVideo(r.rows[0]);
}
