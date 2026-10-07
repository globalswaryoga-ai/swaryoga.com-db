/**
 * GET /api/sadhana/live/[slug]/participants-by-date?date=2026-05-05
 *
 * Fetch all participants who joined a specific date's session
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';

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

    const programDataRes = await bunnyExecute({
      sql: `SELECT name, timezone, time_slots_json, video_duration, countdown_minutes FROM sadhana_programs_sql WHERE slug = ?`,
      args: [params.slug]
    });

    if (!programDataRes.rows || programDataRes.rows.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const programData = programDataRes.rows[0];
    const programName = programData.name || '';
    const timezone = programData.timezone || 'Asia/Kolkata';
    const timeSlots = JSON.parse(programData.time_slots_json || '[]');
    const videoDuration = programData.video_duration || 40;
    const countdownMinutes = programData.countdown_minutes || 3;
    const MIN_ATTENDANCE_MINUTES = 3;

    // Helper: convert a local wall-clock time (in tz) to a UTC Date
    const zonedTimeToUtc = (localIso: string, tz: string) => {
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
    const getUtcRangeForLocalDate = (localDateStr: string, tz: string) => {
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
    const startIsoStr = range.start.toISOString();
    const endIsoStr = range.end.toISOString();

    const participantsRes = await bunnyExecute({
      sql: `SELECT * FROM sadhana_join_history_sql WHERE program_slug = ? AND joined_at >= ? AND joined_at <= ? ORDER BY joined_at ASC`,
      args: [params.slug, startIsoStr, endIsoStr]
    });
    
    const participants = participantsRes.rows || [];

    // Group by time slot
    const participantsBySlot: Record<string, any[]> = {};
    const unlistedParticipants: any[] = [];

    const timeFmt: Intl.DateTimeFormatOptions = { timeZone: timezone, hour: '2-digit', minute: '2-digit' };

    participants.forEach((p: any) => {
      const joinTime = new Date(p.joined_at);

      const hasConfirmedStay = !!p.left_at && new Date(p.left_at).getTime() > joinTime.getTime();
      const leaveTime = hasConfirmedStay ? new Date(p.left_at) : null;
      const duration = leaveTime ? Math.round((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60)) : 0;

      // Must have a confirmed stay of more than 3 minutes to be listed at all.
      if (duration <= MIN_ATTENDANCE_MINUTES) return;

      // Attribute the join to whichever scheduled slot's window (countdown start → session end)
      // it falls inside, rather than requiring an exact-minute match against the slot start time.
      const matchedWindow = slotWindows.find((w) => joinTime >= w.windowStart && joinTime <= w.windowEnd);

      const participantData = {
        name: p.name,
        joinedAt: p.joined_at,
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
      programName: programName,
      totalParticipants: participants.length,
      participantsBySlot,
      unlistedParticipants,
      timeSlots,
    });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana/live/[slug]/participants-by-date');
  }
}
