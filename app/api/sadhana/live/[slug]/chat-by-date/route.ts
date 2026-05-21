/**
 * GET /api/sadhana/live/[slug]/chat-by-date?date=2026-05-05&timeSlot=06:00
 *
 * Fetch chat messages for a specific date and optional time slot (session)
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
    const timeSlot = searchParams.get('timeSlot'); // HH:MM format (optional)

    if (!dateStr) {
      return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
    }

    const db = await getDb();
    const programsDb = await getProgramsDb();
    const chatCol = db.collection('sadhana_live_chat');
    const programsCol = programsDb.collection('sadhana_programs');

    // Get program for timezone and duration info
    const program = await programsCol.findOne({ slug: params.slug });
    const timezone = program?.timezone || 'Asia/Kolkata';
    const videoDuration = program?.videoDuration || 40;

    // Parse the requested date
    const [year, month, day] = dateStr.split('-').map(Number);

    // Helper: convert local date to UTC range
    function getUtcRangeForLocalDate(localDateStr: string, tz: string) {
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
    let messageFilter: any = {
      programSlug: params.slug,
      createdAt: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },
    };

    // If timeSlot specified, filter to that session's time window
    if (timeSlot) {
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const sessionStartLocal = new Date(year, month - 1, day, hours, minutes, 0);
      const sessionEndLocal = new Date(year, month - 1, day, hours, minutes + videoDuration, 0);

      // Convert session times to UTC
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

      const startTzUtc = Date.UTC(
        parseInt(startMap.year),
        parseInt(startMap.month) - 1,
        parseInt(startMap.day),
        parseInt(startMap.hour),
        parseInt(startMap.minute),
        parseInt(startMap.second)
      );

      const endTzUtc = Date.UTC(
        parseInt(endMap.year),
        parseInt(endMap.month) - 1,
        parseInt(endMap.day),
        parseInt(endMap.hour),
        parseInt(endMap.minute),
        parseInt(endMap.second)
      );

      const startOffset = startTzUtc - startAsUtc.getTime();
      const endOffset = endTzUtc - endAsUtc.getTime();

      const sessionStartUtc = new Date(startAsUtc.getTime() - startOffset);
      const sessionEndUtc = new Date(endAsUtc.getTime() - endOffset);

      // Filter to chat within this session's time window
      messageFilter.createdAt = {
        $gte: sessionStartUtc,
        $lte: sessionEndUtc,
      };
    }

    const messages = await chatCol
      .find(messageFilter)
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      date: dateStr,
      timeSlot: timeSlot || null,
      programSlug: params.slug,
      totalMessages: messages.length,
      messages: messages.map(msg => ({
        id: msg._id?.toString() || '',
        name: msg.name || 'Unknown',
        message: msg.message || '',
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana/live/[slug]/chat-by-date');
  }
}
