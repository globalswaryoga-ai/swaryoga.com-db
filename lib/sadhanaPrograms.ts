import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export async function getProgramsDb() {
  await connectDB();
  const crmDb = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  return mongoose.connection.useDb(crmDb);
}

export async function getProgramsCollection() {
  const db = await getProgramsDb();
  return db.collection('sadhana_programs');
}

export async function getProgramVideosCollection() {
  const db = await getProgramsDb();
  return db.collection('sadhana_program_videos');
}

export async function getSessionsCollection() {
  const db = await getProgramsDb();
  const col = db.collection('sadhana_sessions');
  // Create indexes
  await col.createIndex({ programId: 1, date: 1, timeSlot: 1 }, { unique: true, sparse: true });
  await col.createIndex({ programId: 1, date: 1 });
  return col;
}

export interface SessionParticipant {
  _id?: any;
  name: string;
  joinedAt: Date;
  leftAt?: Date;
  durationMinutes?: number;
}

export interface Session {
  _id?: any;
  programId: string;
  programSlug: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM
  createdAt: Date;
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
  _id?: any;
  slug: string;
  name: string;
  description?: string;
  scheduleTime: string; // HH:MM
  timezone: string;
  videoDuration: number; // minutes
  countdownMinutes: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgramVideo {
  _id?: any;
  programId: string;
  date: string; // YYYY-MM-DD in program timezone
  title: string;
  videoUrl: string;
  order?: number;
}

/**
 * Convert local time in a timezone to UTC Date.
 */
export function zonedTimeToUtc(localIsoLike: string, tz: string): Date {
  const asUtc = new Date(localIsoLike + 'Z');
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(asUtc);
  const map: Record<string, string> = {};
  parts.forEach((p) => { map[p.type] = p.value; });
  const tzLocalAsUtc = Date.UTC(
    parseInt(map.year), parseInt(map.month) - 1, parseInt(map.day),
    parseInt(map.hour), parseInt(map.minute), parseInt(map.second)
  );
  const offset = tzLocalAsUtc - asUtc.getTime();
  return new Date(asUtc.getTime() - offset);
}

export function todayInTimezone(now: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
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
