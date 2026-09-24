/**
 * GET /api/sadhana/live/[slug]/participants-by-date?date=2026-05-05
 *
 * Fetch all participants who joined a specific date's session
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramsDb } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

async function getDb() {
  await connectDB();
  return mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date'); // YYYY-MM-DD format

    if (!dateStr) {
      return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
    }

    // Parse date and get the timezone from program
    const db = await getDb();
    const programsDb = await getProgramsDb();
    const programsCol = programsDb.collection('sadhana_programs');
    const program = await programsCol.findOne({ slug: params.slug });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const timezone = program.timezone || 'Asia/Kolkata';
    const timeSlots = program.timeSlots || [];
    const videoDuration = program.videoDuration || 40;
    const countdownMinutes = program.countdownMinutes || 3;
    const MIN_ATTENDANCE_MINUTES = 3;

    // Helper: convert a local wall-clock time (in tz) to a UTC Date
    function zonedTimeToUtc(localIso: string, tz: string): Date {
      const asUtc = new Date(localIso + 'Z');
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

    // Build each scheduled slot's actual join window: from (start - countdown) to (start + duration).
    // This is what "joined our session on schedule" actually means — not an exact-minute match.
    const slotWindows = timeSlots.map((slot: string) => {
      const [h, m] = slot.split(':').map((n: string) => parseInt(n, 10));
      const iso = `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      const slotStartUtc = zonedTimeToUtc(iso, timezone);
      return {
        slot,
        windowStart: new Date(slotStartUtc.getTime() - countdownMinutes * 60 * 1000),
        windowEnd: new Date(slotStartUtc.getTime() + videoDuration * 60 * 1000),
      };
    });

    // Helper: convert local date string to UTC range
    function getUtcRangeForLocalDate(localDateStr: string, tz: string) {
      const [year, month, day] = localDateStr.split('-').map(Number);

      // Treat the date string as a local date (e.g., 2026-05-06 00:00:00 in program timezone)
      // We need to convert this to UTC

      // Create ISO strings for start and end of day
      const startIso = `${localDateStr}T00:00:00`;
      const endIso = `${localDateStr}T23:59:59`;

      // Use Intl to find what UTC time corresponds to midnight local time
      const asUtc = new Date(startIso + 'Z');
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
      parts.forEach((p) => { map[p.type] = p.value; });

      const tzLocalAsUtc = Date.UTC(
        parseInt(map.year),
        parseInt(map.month) - 1,
        parseInt(map.day),
        parseInt(map.hour),
        parseInt(map.minute),
        parseInt(map.second)
      );

      // The offset tells us how far UTC is from what we calculated
      const offset = tzLocalAsUtc - asUtc.getTime();

      // Actual UTC start of day in local timezone
      const startUtc = new Date(asUtc.getTime() - offset);

      // End of day: 23:59:59 local
      const endLocalIso = endIso + 'Z';
      const endAsUtc = new Date(endLocalIso);
      const endUtc = new Date(endAsUtc.getTime() - offset);

      return { start: startUtc, end: endUtc };
    }

    const range = getUtcRangeForLocalDate(dateStr, timezone);
    const startMs = range.start.getTime();
    const endMs = range.end.getTime();

    const joinHistoryCol = db.collection('sadhana_join_history');
    const participants = await joinHistoryCol
      .find({
        programSlug: params.slug,
        joinedAt: {
          $gte: new Date(startMs),
          $lte: new Date(endMs),
        },
      })
      .sort({ joinedAt: 1 })
      .toArray();

    // Group by time slot
    const participantsBySlot: Record<string, any[]> = {};
    const unlistedParticipants: any[] = [];

    const timeFmt: Intl.DateTimeFormatOptions = { timeZone: timezone, hour: '2-digit', minute: '2-digit' };

    participants.forEach((p: any) => {
      const joinTime = new Date(p.joinedAt);

      // lastSeen is heartbeated every ~3s while the viewer is polling /state, so it
      // doubles as an effective "left at" time. If someone closes the tab before their
      // first heartbeat lands, lastSeen never advances past joinedAt — that's not proof
      // they stayed, so treat it as 0 minutes rather than "unknown" (a click alone must
      // not count as attendance).
      const hasConfirmedStay = !!p.lastSeen && new Date(p.lastSeen).getTime() > joinTime.getTime();
      const leaveTime = hasConfirmedStay ? new Date(p.lastSeen) : null;
      const duration = leaveTime ? Math.round((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60)) : 0;

      // Must have a confirmed stay of more than 3 minutes to be listed at all.
      if (duration <= MIN_ATTENDANCE_MINUTES) return;

      // Attribute the join to whichever scheduled slot's window (countdown start → session end)
      // it falls inside, rather than requiring an exact-minute match against the slot start time.
      const matchedWindow = slotWindows.find((w) => joinTime >= w.windowStart && joinTime <= w.windowEnd);

      const participantData = {
        name: p.name,
        joinedAt: p.joinedAt,
        leftAt: leaveTime!.toISOString(),
        joinTime: joinTime.toLocaleTimeString('en-IN', timeFmt),
        leaveTime: leaveTime!.toLocaleTimeString('en-IN', timeFmt),
        duration,
      };

      if (matchedWindow) {
        if (!participantsBySlot[matchedWindow.slot]) {
          participantsBySlot[matchedWindow.slot] = [];
        }
        participantsBySlot[matchedWindow.slot].push(participantData);
      } else {
        unlistedParticipants.push(participantData);
      }
    });

    return NextResponse.json({
      success: true,
      date: dateStr,
      programSlug: params.slug,
      programName: program.name,
      totalParticipants: participants.length,
      participantsBySlot,
      unlistedParticipants,
      timeSlots,
    });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana/live/[slug]/participants-by-date');
  }
}
