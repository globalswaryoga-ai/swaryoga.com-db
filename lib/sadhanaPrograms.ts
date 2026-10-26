import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface SessionParticipant {
  _id?: string;
  name: string;
  joinedAt: Date | string;
  leftAt?: Date | string;
  durationMinutes?: number;
}

export interface Session {
  _id: string;
  programId: string;
  programSlug: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM
  createdAt: Date | string;
  participants: SessionParticipant[];
}

export function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export interface Program {
  _id?: string;
  slug: string;
  name: string;
  description?: string;
  scheduleTime: string; // HH:MM
  timezone: string;
  videoDuration: number; // minutes
  countdownMinutes: number;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ProgramVideo {
  _id?: string;
  programId: string;
  date: string; // YYYY-MM-DD in program timezone
  title: string;
  videoUrl: string;
  order?: number;
}

let initialized = false;
async function initSadhanaSchema() {
  if (initialized) return;
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS sadhana_sessions_sql (
      document_id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).catch(() => null);

  await bunnyExecute(`CREATE INDEX IF NOT EXISTS idx_sadhana_sessions_prog ON sadhana_sessions_sql(program_id, date)`).catch(() => null);
  initialized = true;
}

export async function getSessionsCollection() {
  await initSadhanaSchema();
  return {
    find: (filter: { programId?: string; date?: string }) => ({
      sort: () => ({
        toArray: async () => {
          let sql = 'SELECT document_id as _id, program_id as programId, date, time_slot as timeSlot, data_json, created_at as createdAt FROM sadhana_sessions_sql';
          const conditions: string[] = [];
          const args: any[] = [];
          if (filter.programId) {
            conditions.push('program_id = ?');
            args.push(filter.programId);
          }
          if (filter.date) {
            conditions.push('date = ?');
            args.push(filter.date);
          }
          if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
          }
          sql += ' ORDER BY time_slot ASC';
          const rs = await bunnyExecute({ sql, args }).catch(() => ({ rows: [] }));
          return rs.rows.map((r: any) => {
            const data = r.data_json ? JSON.parse(r.data_json) : {};
            return {
              _id: r._id,
              programId: r.programId,
              date: r.date,
              timeSlot: r.timeSlot,
              createdAt: r.createdAt,
              ...data,
            };
          });
        },
      }),
    }),
    updateOne: async (filter: { programId: string; date: string; timeSlot: string }, update: any, options?: any) => {
      const existing = await bunnyExecute({
        sql: 'SELECT document_id, data_json FROM sadhana_sessions_sql WHERE program_id = ? AND date = ? AND time_slot = ? LIMIT 1',
        args: [filter.programId, filter.date, filter.timeSlot],
      }).catch(() => ({ rows: [] }));

      if (existing.rows.length > 0) {
        return { matchedCount: 1, upsertedId: null };
      }

      const docId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();
      const insertData = update?.$setOnInsert || {};
      const dataJson = JSON.stringify({
        programSlug: insertData.programSlug || 'unknown',
        participants: insertData.participants || [],
      });

      await bunnyExecute({
        sql: `INSERT INTO sadhana_sessions_sql (document_id, program_id, date, time_slot, data_json, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [docId, filter.programId, filter.date, filter.timeSlot, dataJson, now, now],
      });

      return { matchedCount: 0, upsertedId: docId };
    },
    findOneAndUpdate: async (filter: { _id: any }, update: any, options?: any) => {
      const docId = String(filter._id);
      const existing = await bunnyExecute({
        sql: 'SELECT document_id as _id, program_id as programId, date, time_slot as timeSlot, data_json, created_at as createdAt FROM sadhana_sessions_sql WHERE document_id = ? LIMIT 1',
        args: [docId],
      }).catch(() => ({ rows: [] }));

      if (existing.rows.length === 0) {
        return { value: null };
      }

      const row = existing.rows[0];
      const data = row.data_json ? JSON.parse(row.data_json) : {};
      const participants = Array.isArray(data.participants) ? data.participants : [];

      if (update?.$push?.participants) {
        participants.push(update.$push.participants);
      }

      data.participants = participants;
      const now = new Date().toISOString();

      await bunnyExecute({
        sql: 'UPDATE sadhana_sessions_sql SET data_json = ?, updated_at = ? WHERE document_id = ?',
        args: [JSON.stringify(data), now, docId],
      });

      return {
        value: {
          _id: docId,
          programId: row.programId,
          date: row.date,
          timeSlot: row.timeSlot,
          ...data,
        },
      };
    },
  };
}

export function zonedTimeToUtc(localIsoLike: string, tz: string): Date {
  const asUtc = new Date(localIsoLike + 'Z');
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(asUtc);
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  const tzLocalAsUtc = Date.UTC(
    parseInt(map.year),
    parseInt(map.month) - 1,
    parseInt(map.day),
    parseInt(map.hour),
    parseInt(map.minute),
    parseInt(map.second)
  );
  const offset = tzLocalAsUtc - asUtc.getTime();
  return new Date(asUtc.getTime() - offset);
}

export function todayInTimezone(now: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts;
}

export function computeProgramSession(
  program: Program,
  todayVideo: ProgramVideo | null,
  now: Date
) {
  const tz = program.timezone;
  const duration = program.videoDuration || 40;
  const countdown = program.countdownMinutes || 3;

  if (!todayVideo) {
    return {
      status: 'waiting' as const,
      sessionStartUtc: null,
      sessionEndUtc: null,
      nextSessionUtc: null,
      videoOffsetSeconds: 0,
      countdownMinutes: countdown,
      videoDurationMinutes: duration,
    };
  }

  const [h, m] = program.scheduleTime.split(':').map(Number);
  const startIso = `${todayVideo.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  const startUtc = zonedTimeToUtc(startIso, tz);
  const endUtc = new Date(startUtc.getTime() + duration * 60 * 1000);
  const countdownStart = new Date(startUtc.getTime() - countdown * 60 * 1000);

  let status: 'waiting' | 'countdown' | 'live' | 'ended' = 'waiting';
  let videoOffsetSeconds = 0;

  if (now < countdownStart) status = 'waiting';
  else if (now < startUtc) status = 'countdown';
  else if (now < endUtc) {
    status = 'live';
    videoOffsetSeconds = Math.floor((now.getTime() - startUtc.getTime()) / 1000);
  } else status = 'ended';

  return {
    status,
    sessionStartUtc: startUtc.toISOString(),
    sessionEndUtc: endUtc.toISOString(),
    nextSessionUtc: null,
    videoOffsetSeconds,
    countdownMinutes: countdown,
    videoDurationMinutes: duration,
  };
}

export function buildVideoUrlWithOffset(url: string, offsetSec: number): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  let out = `${url}${url.includes('autoplay') ? '' : `${sep}autoplay=true`}`;
  if (offsetSec > 0) {
    out += `${out.includes('?') ? '&' : '?'}t=${offsetSec}`;
  }
  return out;
}
