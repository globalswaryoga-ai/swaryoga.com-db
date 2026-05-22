/**
 * GET /api/sadhana/live/[slug]/participants-by-month?year=2026&month=5
 *
 * Returns participant counts for EVERY day in a month in ONE request.
 * Replaces the old pattern of 31 separate /participants-by-date calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getProgramsDb } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

async function getCrmDb() {
  await connectDB();
  return mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month'); // 1-12

    if (!yearStr || !monthStr) {
      return NextResponse.json({ error: 'year and month parameters required' }, { status: 400 });
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
    }

    // Get program info
    const programsDb = await getProgramsDb();
    const programsCol = programsDb.collection('sadhana_programs');
    const program = await programsCol.findOne({ slug: params.slug });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const timezone = program.timezone || 'Asia/Kolkata';

    // Calculate UTC range for the entire month in the program's timezone
    // Month start: first day of month at 00:00:00 local time
    // Month end: last day of month at 23:59:59 local time
    const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-indexed, trick to get days

    // Convert month boundaries to UTC
    const pad = (n: number) => String(n).padStart(2, '0');
    const firstDay = `${year}-${pad(month)}-01`;
    const lastDay = `${year}-${pad(month)}-${pad(daysInMonth)}`;

    // Create UTC date range that covers the entire month in local timezone
    // Add 1 day buffer on each side to handle timezone offsets
    const startUtc = new Date(`${firstDay}T00:00:00Z`);
    startUtc.setUTCDate(startUtc.getUTCDate() - 1); // 1 day before for timezone safety
    const endUtc = new Date(`${lastDay}T23:59:59Z`);
    endUtc.setUTCDate(endUtc.getUTCDate() + 1); // 1 day after for timezone safety

    // Fetch all sessions for this month in one query
    const db = await getCrmDb();
    const sessionsCol = db.collection('sadhana_sessions');

    const sessions = await sessionsCol.find({
      programId: program._id ? program._id.toString() : undefined,
      sessionDate: { $gte: startUtc, $lte: endUtc },
    }).toArray();

    // Also try by slug in case programId is stored differently
    const sessionsBySlug = await sessionsCol.find({
      programSlug: params.slug,
      sessionDate: { $gte: startUtc, $lte: endUtc },
    }).toArray();

    // Merge and deduplicate
    const allSessions = [...sessions];
    const sessionIds = new Set(sessions.map((s: any) => s._id?.toString()));
    for (const s of sessionsBySlug) {
      if (!sessionIds.has(s._id?.toString())) {
        allSessions.push(s);
      }
    }

    // Also check join_logs or participant records
    const joinLogsCol = db.collection('sadhana_join_history');
    const joinLogs = await joinLogsCol.find({
      programSlug: params.slug,
      joinedAt: { $gte: startUtc, $lte: endUtc },
    }).toArray();

    // Group by local date using the program timezone
    const countsByDate: Record<string, number> = {};

    // Initialize all days to 0
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month)}-${pad(d)}`;
      countsByDate[dateStr] = 0;
    }

    // Count participants from join logs
    for (const log of joinLogs) {
      const joinDate = log.joinedAt ? new Date(log.joinedAt) : null;
      if (!joinDate) continue;

      // Convert UTC to local date string in program timezone
      const localDateStr = joinDate.toLocaleDateString('en-CA', { timeZone: timezone }); // en-CA gives YYYY-MM-DD
      if (countsByDate[localDateStr] !== undefined) {
        countsByDate[localDateStr]++;
      }
    }

    // Also count from sessions
    for (const session of allSessions) {
      const sessionDate = session.sessionDate ? new Date(session.sessionDate) : null;
      if (!sessionDate) continue;

      const localDateStr = sessionDate.toLocaleDateString('en-CA', { timeZone: timezone });
      if (countsByDate[localDateStr] !== undefined) {
        const participantCount = session.participantCount ||
          (Array.isArray(session.participants) ? session.participants.length : 0);
        // Only update if we don't already have data from join_logs (avoid double-counting)
        if (countsByDate[localDateStr] === 0 && participantCount > 0) {
          countsByDate[localDateStr] = participantCount;
        }
      }
    }

    return NextResponse.json({
      success: true,
      year,
      month,
      daysInMonth,
      countsByDate, // { "2026-05-01": 5, "2026-05-02": 3, ... }
    });
  } catch (error) {
    console.error('[participants-by-month]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
