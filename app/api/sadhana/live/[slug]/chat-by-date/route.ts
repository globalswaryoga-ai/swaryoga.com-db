/**
 * GET /api/sadhana/live/[slug]/chat-by-date?date=2026-05-05&timeSlot=06:00
 *
 * Fetch chat messages for a specific date and optional time slot (session)
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
    const timeSlot = searchParams.get('timeSlot'); // HH:MM format (optional)

    if (!dateStr) {
      return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
    }

    const programData = await bunnyExecute({
      sql: `SELECT timezone, video_duration FROM sadhana_programs_sql WHERE slug = ?`,
      args: [params.slug]
    });
    
    if (!programData.rows || programData.rows.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const timezone = programData.rows[0].timezone || 'Asia/Kolkata';
    const videoDuration = programData.rows[0].video_duration || 40;

    // Parse the requested date
    const [year, month, day] = dateStr.split('-').map(Number);

    // Helper: convert local date to UTC range
    const getUtcRangeForLocalDate = (localDateStr: string, tz: string) => {
      const startIso = `${localDateStr}T00:00:00`;
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

      const offset = tzLocalAsUtc - asUtc.getTime();
      const startUtc = new Date(asUtc.getTime() - offset);
      const endLocalIso = `${localDateStr}T23:59:59Z`;
      const endAsUtc = new Date(endLocalIso);
      const endUtc = new Date(endAsUtc.getTime() - offset);

      return { start: startUtc, end: endUtc };
    }

    const dateRange = getUtcRangeForLocalDate(dateStr, timezone);
    let messages: any[] = [];
    if (timeSlot) {
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const sessionStartLocal = new Date(year, month - 1, day, hours, minutes, 0);
      const sessionEndLocal = new Date(year, month - 1, day, hours, minutes + videoDuration, 0);

      const sessionStartIso = sessionStartLocal.toISOString().slice(0, 19);
      const sessionEndIso = sessionEndLocal.toISOString().slice(0, 19);

      const startAsUtc = new Date(sessionStartIso + 'Z');
      const endAsUtc = new Date(sessionEndIso + 'Z');

      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const startParts = dtf.formatToParts(startAsUtc);
      const endParts = dtf.formatToParts(endAsUtc);

      const startMap: Record<string, string> = {};
      const endMap: Record<string, string> = {};
      startParts.forEach((p) => { startMap[p.type] = p.value; });
      endParts.forEach((p) => { endMap[p.type] = p.value; });

      const startTzUtc = Date.UTC(parseInt(startMap.year), parseInt(startMap.month) - 1, parseInt(startMap.day), parseInt(startMap.hour), parseInt(startMap.minute), parseInt(startMap.second));
      const endTzUtc = Date.UTC(parseInt(endMap.year), parseInt(endMap.month) - 1, parseInt(endMap.day), parseInt(endMap.hour), parseInt(endMap.minute), parseInt(endMap.second));

      const sessionStartUtc = new Date(startAsUtc.getTime() - (startTzUtc - startAsUtc.getTime()));
      const sessionEndUtc = new Date(endAsUtc.getTime() - (endTzUtc - endAsUtc.getTime()));

      const chatRes = await bunnyExecute({
        sql: `SELECT * FROM sadhana_live_chat_sql WHERE program_slug = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at ASC`,
        args: [params.slug, sessionStartUtc.toISOString(), sessionEndUtc.toISOString()]
      });
      messages = chatRes.rows || [];
    } else {
      const chatRes = await bunnyExecute({
        sql: `SELECT * FROM sadhana_live_chat_sql WHERE program_slug = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at ASC`,
        args: [params.slug, dateRange.start.toISOString(), dateRange.end.toISOString()]
      });
      messages = chatRes.rows || [];
    }

    return NextResponse.json({
      success: true,
      date: dateStr,
      timeSlot: timeSlot || null,
      programSlug: params.slug,
      totalMessages: messages.length,
      messages: messages.map(msg => ({
        id: msg.id || '',
        name: msg.sender || 'Unknown',
        message: msg.message || '',
        createdAt: msg.created_at,
      })),
    });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana/live/[slug]/chat-by-date');
  }
}
